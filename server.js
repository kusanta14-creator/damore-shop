const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const axios = require('axios');

dotenv.config();

const connectDB = require('./config/db');
const adminRoutes = require('./routes/admin');
const adminShortsRoutes = require('./routes/admin-shorts');
const adminProductsRoutes = require('./routes/admin-products');
const authRoutes = require('./routes/auth');

const Product = require('./models/Product');
const Order = require('./models/Order');
const SiteContent = require('./models/SiteContent');
const Category = require('./models/Category');
const User = require('./models/User');
const Admin = require('./models/Admin');
const HeroSlide = require('./models/HeroSlide');
const HomeSection = require('./models/HomeSection');
const ShortsItem = require('./models/ShortsItem');

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const TOSS_CLIENT_KEY = process.env.TOSS_CLIENT_KEY || '';
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'damore_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    }
  })
);

app.use(async (req, res, next) => {
  try {
    res.locals.adminId = null;
    res.locals.isAdmin = false;
    res.locals.currentUser = null;
    res.locals.tossClientKey = TOSS_CLIENT_KEY;
    res.locals.currentPath = req.path;

    if (req.session && req.session.adminId) {
      const admin = await Admin.findById(req.session.adminId).select('username');
      if (admin) {
        res.locals.adminId = admin._id.toString();
        res.locals.isAdmin = true;
      } else {
        req.session.adminId = null;
      }
    }

    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).select('name email');
      if (user) {
        res.locals.currentUser = user;
      } else {
        req.session.userId = null;
      }
    }

    res.locals.cartCount = req.session && req.session.cart
      ? req.session.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0;

    next();
  } catch (error) {
    console.error(error);
    next();
  }
});

function normalizeProductStatus(product) {
  if (!product) return product;

  if (Number(product.stock || 0) <= 0) {
    product.stock = 0;
    product.status = 'soldout';
  } else {
    product.status = 'active';
  }

  return product;
}

async function syncProductStatus(product) {
  normalizeProductStatus(product);
  await product.save();
  return product;
}

function createMerchantUid() {
  const random = Math.random().toString(36).slice(2, 10);
  return `DAMORE_${Date.now()}_${random}`;
}

function createOrderName(items) {
  if (!items || items.length === 0) return '상품 주문';
  if (items.length === 1) return items[0].name;
  return `${items[0].name} 외 ${items.length - 1}건`;
}

function parseSelectedAddOns(body) {
  const ids = String(body.selectedAddOnIds || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const names = String(body.selectedAddOnNames || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const total = Math.max(Number(body.selectedAddOnTotal) || 0, 0);

  const items = names.map((name, index) => ({
    productId: ids[index] || '',
    name,
    price: 0
  }));

  return {
    ids,
    names,
    total,
    items
  };
}

function getNormalizedSelections(body) {
  const option = String(body.selectedOption || body.option || '').trim();
  const color = String(body.selectedColor || '').trim();
  const addOns = parseSelectedAddOns(body);

  return {
    option,
    color,
    addOns
  };
}

function isSameCartItem(item, productId, option, color, addOnIds) {
  const currentAddOnIds = Array.isArray(item.addOnIds) ? item.addOnIds : [];
  return (
    item.productId === productId &&
    String(item.option || '') === String(option || '') &&
    String(item.color || '') === String(color || '') &&
    currentAddOnIds.join(',') === addOnIds.join(',')
  );
}

async function validateOrderItems(orderItems) {
  for (const item of orderItems) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new Error(`${item.name} 상품이 존재하지 않습니다.`);
    }

    normalizeProductStatus(product);

    if (product.stock <= 0 || product.status === 'soldout') {
      throw new Error(`${product.name} 상품은 현재 품절입니다.`);
    }

    if (Number(item.quantity) > Number(product.stock)) {
      throw new Error(`${product.name} 재고가 부족합니다. 현재 재고: ${product.stock}개`);
    }
  }
}

async function deductOrderStock(order) {
  await validateOrderItems(order.items);

  for (const item of order.items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new Error(`${item.name} 상품이 존재하지 않습니다.`);
    }

    product.stock = Math.max(Number(product.stock || 0) - Number(item.quantity || 0), 0);
    await syncProductStatus(product);
  }
}

function sortProductsForSection(products, source) {
  const list = Array.isArray(products) ? [...products] : [];

  if (source === 'best') {
    return list.sort((a, b) => {
      const aReview = Number(a.reviewCount || 0);
      const bReview = Number(b.reviewCount || 0);
      if (bReview !== aReview) return bReview - aReview;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getProductsByManualIds(manualIds, limit) {
  const ids = Array.isArray(manualIds)
    ? manualIds.map(v => String(v).trim()).filter(Boolean)
    : [];

  if (!ids.length) return [];

  const products = await Product.find({
    _id: { $in: ids }
  });

  const map = new Map(products.map(product => [String(product._id), product]));
  const ordered = ids
    .map(id => map.get(id))
    .filter(Boolean)
    .slice(0, limit);

  ordered.forEach(normalizeProductStatus);
  return ordered;
}

async function getProductsForSection(section, tab = null) {
  const source = String(section.productSource || 'latest').trim();
  const limit = Math.max(Number(section.productLimit || 8), 1);

  const targetCategory = String(
    tab?.category || section.category || ''
  ).trim().toLowerCase();

  const targetSubCategory = String(
    tab?.subCategory || section.subCategory || ''
  ).trim();

  if (source === 'manual') {
    return getProductsByManualIds(section.manualProductIds, limit);
  }

  const filter = {};

  if (targetCategory) {
    filter.category = targetCategory;
  }

  if (targetSubCategory) {
    filter.subCategory = targetSubCategory;
  }

  if (source === 'best') {
    filter.isBest = true;
  }

  let products = await Product.find(filter);

  products.forEach(normalizeProductStatus);
  products = sortProductsForSection(products, source);

  return products.slice(0, limit);
}

async function buildHomeSectionProductsMap(homeSections) {
  const map = {};

  for (const section of homeSections) {
    if (!section || !section.isVisible) continue;

    if (Array.isArray(section.tabs) && section.tabs.length > 0) {
      const tabProducts = [];

      for (const tab of section.tabs) {
        const products = await getProductsForSection(section, tab);
        tabProducts.push(products);
      }

      map[String(section._id)] = tabProducts;
    } else {
      const products = await getProductsForSection(section);
      map[String(section._id)] = products;
    }
  }

  return map;
}

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/', authRoutes);

// 메인 페이지
app.get('/', async (req, res) => {
  try {
    const category = (req.query.category || '').trim().toLowerCase();
    const keyword = (req.query.keyword || '').trim();
    const sort = (req.query.sort || 'latest').trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 8;

    const filter = {};

    if (category) filter.category = category;
    if (keyword) filter.name = { $regex: keyword, $options: 'i' };

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1, createdAt: -1 };
    else if (sort === 'price_desc') sortOption = { price: -1, createdAt: -1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalProducts / limit), 1);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const allProducts = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    allProducts.forEach(normalizeProductStatus);

    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    let bestProducts = [];
    if (category) {
      bestProducts = await Product.find({
        category,
        isBest: true,
        ...(keyword ? { name: { $regex: keyword, $options: 'i' } } : {})
      })
        .sort({ createdAt: -1 })
        .limit(4);

      bestProducts.forEach(normalizeProductStatus);
    }

    let siteContent = await SiteContent.findOne();
    if (!siteContent) {
      siteContent = await SiteContent.create({});
    }

    const heroSlides = await HeroSlide.find({ isActive: true }).sort({ order: 1, createdAt: 1 });

    let homeSections = [];
    let homeSectionProductsMap = {};
    let shortsItems = [];

    if (!category) {
      homeSections = await HomeSection.find({
        isVisible: true
      }).sort({ order: 1, createdAt: 1 });

      homeSectionProductsMap = await buildHomeSectionProductsMap(homeSections);

      const shortsDocs = await ShortsItem.find({ isVisible: true })
        .populate('productId')
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(4);

      shortsItems = shortsDocs.map((item) => {
        const product = item.productId && item.productId._id ? item.productId : null;

        return {
          _id: item._id,
          title: item.title || '',
          brandLabel: item.brandLabel || 'DAMORE SHORTS',
          video: item.video || '',
          poster: item.poster || '',
          link: product ? `/products/${product._id}` : (item.link || '/about'),
          productTitle: product
            ? (product.name || '')
            : (item.productTitle || ''),
          productPrice: product
            ? `₩${Number(product.price || 0).toLocaleString()}`
            : (item.productPrice || ''),
          productThumb: product
            ? (product.image || item.poster || '')
            : (item.productThumb || item.poster || '')
        };
      });
    }

    res.render('home', {
      allProducts,
      bestProducts,
      heroSlides,
      homeSections,
      homeSectionProductsMap,
      shortsItems,
      category,
      categories,
      siteContent,
      keyword,
      sort,
      currentPage: safePage,
      totalPages,
      totalProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('메인 페이지 오류');
  }
});

// 카테고리 페이지
app.get('/category/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const keyword = String(req.query.keyword || '').trim();
    const sort = String(req.query.sort || 'latest').trim();
    const sub = String(req.query.sub || '').trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 12;

    const filter = { category: slug };

    if (sub) {
      filter.subCategory = sub;
    }

    if (keyword) {
      filter.name = { $regex: keyword, $options: 'i' };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1, createdAt: -1 };
    else if (sort === 'price_desc') sortOption = { price: -1, createdAt: -1 };
    else if (sort === 'name_asc') sortOption = { name: 1 };

    const categoryDoc = await Category.findOne({ name: slug });

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalProducts / limit), 1);
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    products.forEach(normalizeProductStatus);

    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    let siteContent = await SiteContent.findOne();
    if (!siteContent) {
      siteContent = await SiteContent.create({});
    }

    res.render('category', {
      products,
      category: slug,
      categoryDoc,
      categories,
      keyword,
      sort,
      sub,
      totalProducts,
      totalPages,
      currentPage: safePage,
      siteContent
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 페이지 오류');
  }
});

// 브랜드 소개 페이지
app.get('/about', async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    let siteContent = await SiteContent.findOne();
    if (!siteContent) {
      siteContent = await SiteContent.create({});
    }

    res.render('about', {
      categories,
      siteContent
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('브랜드 소개 페이지 오류');
  }
});

// 상품 상세
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send('상품이 없습니다');
    }

    normalizeProductStatus(product);

    const addOnProducts = await Product.find({
      _id: { $ne: product._id },
      stock: { $gt: 0 }
    })
      .sort({ createdAt: -1 })
      .limit(4);

    addOnProducts.forEach(normalizeProductStatus);

    res.render('product-detail', {
      product,
      addOnProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 상세 페이지 오류');
  }
});

// 장바구니 담기
app.post('/cart/add', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = Math.max(Number(quantity) || 1, 1);
    const { option, color, addOns } = getNormalizedSelections(req.body);

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('상품이 없습니다');

    normalizeProductStatus(product);

    if (product.stock <= 0 || product.status === 'soldout') {
      return res.status(400).send('품절 상품입니다');
    }

    if (qty > product.stock) {
      return res.status(400).send(`재고가 부족합니다. 현재 재고: ${product.stock}개`);
    }

    if (!req.session.cart) req.session.cart = [];

    const existingItem = req.session.cart.find(item => {
      return isSameCartItem(item, productId, option, color, addOns.ids);
    });

    const existingQty = existingItem ? Number(existingItem.quantity || 0) : 0;
    const nextQty = existingQty + qty;

    if (nextQty > product.stock) {
      return res.status(400).send(`재고가 부족합니다. 현재 재고: ${product.stock}개`);
    }

    if (existingItem) {
      existingItem.quantity = nextQty;
    } else {
      req.session.cart.push({
        productId: product._id.toString(),
        name: product.name,
        price: product.price,
        image: product.image,
        option,
        color,
        addOnIds: addOns.ids,
        addOnNames: addOns.names,
        addOnTotal: addOns.total,
        optionLabelParts: [option, color].filter(Boolean),
        quantity: qty
      });
    }

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).send('장바구니 추가 오류');
  }
});

// 장바구니
app.get('/cart', async (req, res) => {
  try {
    const cart = req.session.cart || [];

    for (const item of cart) {
      const product = await Product.findById(item.productId);
      if (product) {
        normalizeProductStatus(product);
        item.stock = product.stock;
        item.productStatus = product.status;
      } else {
        item.stock = 0;
        item.productStatus = 'soldout';
      }
    }

    const totalPrice = cart.reduce((sum, item) => {
      const productTotal = Number(item.price || 0) * Number(item.quantity || 0);
      const addOnTotal = Number(item.addOnTotal || 0);
      return sum + productTotal + addOnTotal;
    }, 0);

    res.render('cart', { cart, totalPrice });
  } catch (error) {
    console.error(error);
    res.status(500).send('장바구니 페이지 오류');
  }
});

// 장바구니 수량 변경
app.post('/cart/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const { option, color, addOns } = getNormalizedSelections(req.body);
    const newQuantity = Math.max(Number(quantity) || 1, 1);

    if (!req.session.cart) return res.redirect('/cart');

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('상품이 없습니다');

    normalizeProductStatus(product);

    if (product.stock <= 0) {
      return res.status(400).send('품절 상품입니다');
    }

    if (newQuantity > product.stock) {
      return res.status(400).send(`재고가 부족합니다. 현재 재고: ${product.stock}개`);
    }

    req.session.cart = req.session.cart.map(item => {
      if (isSameCartItem(item, productId, option, color, addOns.ids)) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).send('장바구니 수량 변경 오류');
  }
});

// 장바구니 수량 증가
app.post('/cart/increase', async (req, res) => {
  try {
    const { productId } = req.body;
    const { option, color, addOns } = getNormalizedSelections(req.body);
    if (!req.session.cart) return res.redirect('/cart');

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('상품이 없습니다');

    normalizeProductStatus(product);

    req.session.cart = req.session.cart.map(item => {
      if (isSameCartItem(item, productId, option, color, addOns.ids)) {
        if (Number(item.quantity) + 1 > Number(product.stock)) {
          throw new Error(`재고가 부족합니다. 현재 재고: ${product.stock}개`);
        }
        return { ...item, quantity: Number(item.quantity) + 1 };
      }
      return item;
    });

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message || '장바구니 수량 증가 오류');
  }
});

// 장바구니 수량 감소
app.post('/cart/decrease', (req, res) => {
  try {
    const { productId } = req.body;
    const { option, color, addOns } = getNormalizedSelections(req.body);
    if (!req.session.cart) return res.redirect('/cart');

    req.session.cart = req.session.cart.map(item => {
      if (isSameCartItem(item, productId, option, color, addOns.ids)) {
        return { ...item, quantity: Math.max(Number(item.quantity) - 1, 1) };
      }
      return item;
    });

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).send('장바구니 수량 감소 오류');
  }
});

// 장바구니 삭제
app.post('/cart/remove', (req, res) => {
  try {
    const { productId } = req.body;
    const { option, color, addOns } = getNormalizedSelections(req.body);
    if (!req.session.cart) return res.redirect('/cart');

    req.session.cart = req.session.cart.filter(item => {
      return !isSameCartItem(item, productId, option, color, addOns.ids);
    });

    res.redirect('/cart');
  } catch (error) {
    console.error(error);
    res.status(500).send('장바구니 삭제 오류');
  }
});

// 바로구매
app.post('/buy-now', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qty = Math.max(Number(quantity) || 1, 1);
    const { option, color, addOns } = getNormalizedSelections(req.body);

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('상품이 없습니다');

    normalizeProductStatus(product);

    if (product.stock <= 0 || product.status === 'soldout') {
      return res.status(400).send('품절 상품입니다');
    }

    if (qty > product.stock) {
      return res.status(400).send(`재고가 부족합니다. 현재 재고: ${product.stock}개`);
    }

    req.session.buyNow = [
      {
        productId: product._id.toString(),
        name: product.name,
        price: product.price,
        image: product.image,
        option,
        color,
        addOnIds: addOns.ids,
        addOnNames: addOns.names,
        addOnTotal: addOns.total,
        optionLabelParts: [option, color].filter(Boolean),
        quantity: qty
      }
    ];

    res.redirect('/order');
  } catch (error) {
    console.error(error);
    res.status(500).send('바로구매 오류');
  }
});

// 주문서
app.get('/order', async (req, res) => {
  try {
    const orderItems =
      req.session.buyNow && req.session.buyNow.length > 0
        ? req.session.buyNow
        : (req.session.cart || []);

    if (!orderItems.length) {
      return res.redirect('/cart');
    }

    for (const item of orderItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).send('존재하지 않는 상품이 포함되어 있습니다.');
      }

      normalizeProductStatus(product);

      if (product.stock <= 0) {
        return res.status(400).send(`${product.name} 상품이 품절되었습니다.`);
      }

      if (Number(item.quantity) > Number(product.stock)) {
        return res.status(400).send(`${product.name} 재고가 부족합니다. 현재 재고: ${product.stock}개`);
      }

      item.stock = product.stock;
    }

    const totalPrice = orderItems.reduce((sum, item) => {
      const productTotal = Number(item.price || 0) * Number(item.quantity || 0);
      const addOnTotal = Number(item.addOnTotal || 0);
      return sum + productTotal + addOnTotal;
    }, 0);

    res.render('order', {
      cart: orderItems,
      totalPrice,
      baseUrl: BASE_URL
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('주문 페이지 오류');
  }
});

// 결제대기 주문 생성
app.post('/order/create-pending', async (req, res) => {
  try {
    const { name, phone, address, payment } = req.body;

    if (!TOSS_CLIENT_KEY || !TOSS_SECRET_KEY) {
      return res.status(400).json({
        ok: false,
        message: '토스 결제 키가 설정되지 않았습니다. .env를 확인해주세요.'
      });
    }

    const orderItems =
      req.session.buyNow && req.session.buyNow.length > 0
        ? req.session.buyNow
        : (req.session.cart || []);

    if (!orderItems.length) {
      return res.status(400).json({ ok: false, message: '주문 상품이 없습니다.' });
    }

    await validateOrderItems(orderItems);

    const totalPrice = orderItems.reduce((sum, item) => {
      const productTotal = Number(item.price || 0) * Number(item.quantity || 0);
      const addOnTotal = Number(item.addOnTotal || 0);
      return sum + productTotal + addOnTotal;
    }, 0);

    const merchantUid = createMerchantUid();
    const orderName = createOrderName(orderItems);

    const order = await Order.create({
      userId: req.session.userId || null,
      customerName: name,
      phone,
      address,
      payment,
      items: orderItems,
      totalPrice,
      status: 'pending_payment',
      trackingNumber: '',
      shippedAt: null,
      deliveredAt: null,
      cancelRequestStatus: 'none',
      cancelRequestReason: '',
      merchantUid,
      paymentKey: '',
      paymentProvider: 'tosspayments',
      paymentMethod: payment,
      paidAt: null,
      paymentFailedAt: null,
      failReason: ''
    });

    req.session.pendingOrderId = order._id.toString();

    return res.json({
      ok: true,
      orderId: order.merchantUid,
      orderName,
      amount: order.totalPrice,
      customerName: order.customerName,
      customerEmail: res.locals.currentUser?.email || '',
      customerMobilePhone: order.phone || ''
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      ok: false,
      message: error.message || '결제대기 주문 생성 오류'
    });
  }
});

// 토스 결제 성공 -> 서버 승인
app.get('/payment/toss/success', async (req, res) => {
  try {
    const paymentKey = String(req.query.paymentKey || '').trim();
    const orderId = String(req.query.orderId || '').trim();
    const amount = Number(req.query.amount || 0);

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).send('결제 승인 파라미터가 올바르지 않습니다.');
    }

    if (!TOSS_SECRET_KEY) {
      return res.status(400).send('토스 시크릿 키가 설정되지 않았습니다.');
    }

    const order = await Order.findOne({ merchantUid: orderId });
    if (!order) {
      return res.status(404).send('주문을 찾을 수 없습니다.');
    }

    if (order.status === 'paid') {
      req.session.lastOrderId = order._id.toString();
      return res.render('payment-success', { order });
    }

    if (order.status !== 'pending_payment') {
      return res.status(400).send('결제 승인 가능한 주문 상태가 아닙니다.');
    }

    if (Number(order.totalPrice) !== amount) {
      return res.status(400).send('결제 금액 검증에 실패했습니다.');
    }

    const authKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

    const confirmResponse = await axios.post(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        paymentKey,
        orderId,
        amount
      },
      {
        headers: {
          Authorization: `Basic ${authKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await deductOrderStock(order);

    order.status = 'paid';
    order.paymentKey = paymentKey;
    order.paymentProvider = 'tosspayments';
    order.paymentMethod = confirmResponse.data.method || order.paymentMethod || order.payment;
    order.paidAt = new Date();
    order.failReason = '';
    order.paymentFailedAt = null;

    await order.save();

    req.session.lastOrderId = order._id.toString();
    req.session.pendingOrderId = null;
    req.session.cart = [];
    req.session.buyNow = null;

    res.render('payment-success', { order });
  } catch (error) {
    console.error(error?.response?.data || error);

    const code = error?.response?.data?.code || 'PAYMENT_CONFIRM_FAILED';
    const message = error?.response?.data?.message || '결제 승인 중 오류가 발생했습니다.';

    res.render('payment-fail', {
      order: null,
      reason: `[${code}] ${message}`
    });
  }
});

// 토스 결제 실패
app.get('/payment/toss/fail', async (req, res) => {
  try {
    const code = String(req.query.code || '').trim();
    const message = String(req.query.message || '').trim() || '결제 실패';
    const orderId = String(req.query.orderId || '').trim();

    let order = null;

    if (orderId) {
      order = await Order.findOne({ merchantUid: orderId });

      if (order && order.status === 'pending_payment') {
        order.status = 'payment_failed';
        order.failReason = `[${code || 'FAIL'}] ${message}`;
        order.paymentFailedAt = new Date();
        await order.save();
      }
    }

    res.render('payment-fail', {
      order,
      reason: `[${code || 'FAIL'}] ${message}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('결제 실패 처리 오류');
  }
});

// 주문완료
app.get('/order/complete', async (req, res) => {
  try {
    if (!req.session.lastOrderId) {
      return res.redirect('/');
    }

    const order = await Order.findById(req.session.lastOrderId);
    if (!order) {
      return res.redirect('/');
    }

    res.render('order-complete', { order });
  } catch (error) {
    console.error(error);
    res.status(500).send('주문 완료 페이지 오류');
  }
});

// 내 주문내역
app.get('/my-orders', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const orders = await Order.find({
      userId: req.session.userId,
      status: { $nin: ['hidden', 'test'] }
    }).sort({ createdAt: -1 });

    res.render('my-orders', { orders });
  } catch (error) {
    console.error(error);
    res.status(500).send('내 주문내역 페이지 오류');
  }
});

// 회원 취소 요청
app.post('/my-orders/:id/cancel-request', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const reason = (req.body.reason || '').trim();

    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!order) return res.redirect('/my-orders');
    if (order.status !== 'paid') return res.redirect('/my-orders');
    if (order.cancelRequestStatus === 'requested') return res.redirect('/my-orders');
    if (order.status === 'cancelled') return res.redirect('/my-orders');

    order.cancelRequestStatus = 'requested';
    order.cancelRequestReason = reason || '고객 요청';
    await order.save();

    res.redirect('/my-orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('주문취소 요청 오류');
  }
});

// 비회원 주문조회
app.get('/order/lookup', (req, res) => {
  res.render('order-lookup', {
    error: '',
    orderId: '',
    phone: ''
  });
});

app.post('/order/lookup', async (req, res) => {
  try {
    const orderId = (req.body.orderId || '').trim();
    const phone = (req.body.phone || '').trim();

    if (!orderId || !phone) {
      return res.render('order-lookup', {
        error: '주문번호와 연락처를 모두 입력해주세요.',
        orderId,
        phone
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      phone,
      status: { $nin: ['hidden', 'test'] }
    });

    if (!order) {
      return res.render('order-lookup', {
        error: '일치하는 주문이 없습니다. 주문번호와 연락처를 다시 확인해주세요.',
        orderId,
        phone
      });
    }

    res.render('order-lookup-result', { order });
  } catch (error) {
    console.error(error);
    return res.render('order-lookup', {
      error: '주문번호 형식이 올바르지 않거나 조회 중 오류가 발생했습니다.',
      orderId: (req.body.orderId || '').trim(),
      phone: (req.body.phone || '').trim()
    });
  }
});

// 비회원 취소 요청
app.post('/order/lookup/cancel-request', async (req, res) => {
  try {
    const orderId = (req.body.orderId || '').trim();
    const phone = (req.body.phone || '').trim();
    const reason = (req.body.reason || '').trim();

    const order = await Order.findOne({
      _id: orderId,
      phone,
      status: { $nin: ['hidden', 'test'] }
    });

    if (!order) return res.status(404).send('주문을 찾을 수 없습니다.');
    if (order.status !== 'paid') return res.status(400).send('현재 상태에서는 취소 요청이 불가합니다.');
    if (order.cancelRequestStatus === 'requested') return res.redirect('/order/lookup');
    if (order.status === 'cancelled') return res.status(400).send('이미 취소된 주문입니다.');

    order.cancelRequestStatus = 'requested';
    order.cancelRequestReason = reason || '비회원 요청';
    await order.save();

    res.redirect('/order/lookup');
  } catch (error) {
    console.error(error);
    res.status(500).send('비회원 취소 요청 오류');
  }
});

app.use('/admin/products', adminProductsRoutes);
app.use('/admin/shorts', adminShortsRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${BASE_URL}`);
});