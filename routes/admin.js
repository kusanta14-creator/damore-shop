console.log('admin routes loaded - sharp resize version');
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SiteContent = require('../models/SiteContent');
const Category = require('../models/Category');
const HeroSlide = require('../models/HeroSlide');
const HomeSection = require('../models/HomeSection');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

function checkAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect('/admin/login?error=' + encodeURIComponent('관리자만 접근할 수 있습니다.'));
  }
  next();
}

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options.map(v => String(v).trim()).filter(Boolean);
  }

  if (typeof options === 'string' && options.trim()) {
    return options
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeColors(colors) {
  if (Array.isArray(colors)) {
    return colors.map(v => String(v).trim()).filter(Boolean);
  }

  if (typeof colors === 'string' && colors.trim()) {
    return colors
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }

  return [];
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function makeFileName(prefix = 'img', ext = '.webp') {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `${prefix}-${timestamp}-${random}${ext}`;
}

function getFileExt(file) {
  const original = (file?.originalname || '').toLowerCase();
  const ext = path.extname(original);
  return ext || '';
}

function isAnimatedCandidate(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const ext = getFileExt(file);

  return (
    mime === 'image/gif' ||
    mime === 'image/webp' ||
    ext === '.gif' ||
    ext === '.webp'
  );
}

async function saveOriginalFile(file, folder) {
  if (!file || !file.buffer) return '';

  const ext = getFileExt(file) || '.bin';
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads', folder);
  ensureDir(uploadDir);

  const fileName = makeFileName(folder, ext);
  const outputPath = path.join(uploadDir, fileName);

  await fs.promises.writeFile(outputPath, file.buffer);
  return `/uploads/${folder}/${fileName}`;
}

async function saveResizedImage(file, folder, options = {}) {
  if (!file || !file.buffer) return '';

  const {
    width = null,
    height = null,
    fit = 'inside',
    quality = 95
  } = options;

  const uploadDir = path.join(__dirname, '..', 'public', 'uploads', folder);
  ensureDir(uploadDir);

  const fileName = makeFileName(folder, '.webp');
  const outputPath = path.join(uploadDir, fileName);

  let transformer = sharp(file.buffer).rotate();

  if (width && height) {
    transformer = transformer.resize(width, height, {
      fit,
      position: 'centre',
      withoutEnlargement: true
    });
  } else if (width) {
    transformer = transformer.resize({
      width,
      fit,
      withoutEnlargement: true
    });
  } else if (height) {
    transformer = transformer.resize({
      height,
      fit,
      withoutEnlargement: true
    });
  }

  await transformer.webp({ quality }).toFile(outputPath);
  return `/uploads/${folder}/${fileName}`;
}

async function saveImagePreserveAnimation(file, folder, options = {}) {
  if (!file || !file.buffer) return '';

  if (isAnimatedCandidate(file)) {
    return saveOriginalFile(file, folder);
  }

  return saveResizedImage(file, folder, options);
}

async function getUploadedFiles(req) {
  const image = req.files?.image?.[0]
    ? await saveImagePreserveAnimation(req.files.image[0], 'products', {
        width: 1200,
        height: 1600,
        fit: 'inside',
        quality: 95
      })
    : '';

  const detailImage = req.files?.detailImage?.[0]
    ? await saveImagePreserveAnimation(req.files.detailImage[0], 'products', {
        width: 1400,
        fit: 'inside',
        quality: 95
      })
    : '';

  const detailImages = req.files?.detailImages
    ? await Promise.all(
        req.files.detailImages.map(file =>
          saveImagePreserveAnimation(file, 'products', {
            width: 1400,
            fit: 'inside',
            quality: 95
          })
        )
      )
    : [];

  return { image, detailImage, detailImages };
}

function buildFooterSns(body) {
  const types = Array.isArray(body.footerSnsType)
    ? body.footerSnsType
    : body.footerSnsType
      ? [body.footerSnsType]
      : [];

  const urls = Array.isArray(body.footerSnsUrl)
    ? body.footerSnsUrl
    : body.footerSnsUrl
      ? [body.footerSnsUrl]
      : [];

  const labels = Array.isArray(body.footerSnsLabel)
    ? body.footerSnsLabel
    : body.footerSnsLabel
      ? [body.footerSnsLabel]
      : [];

  const maxLength = Math.max(types.length, urls.length, labels.length);
  const result = [];

  for (let i = 0; i < maxLength; i += 1) {
    const type = String(types[i] || '').trim();
    const url = String(urls[i] || '').trim();
    const label = String(labels[i] || '').trim();

    if (!type && !url && !label) continue;

    result.push({
      type: type || 'instagram',
      url: url || '#',
      label
    });
  }

  return result;
}

function normalizeHomeSectionTabs(body) {
  const labels = Array.isArray(body.tabLabel)
    ? body.tabLabel
    : body.tabLabel
      ? [body.tabLabel]
      : [];

  const categories = Array.isArray(body.tabCategory)
    ? body.tabCategory
    : body.tabCategory
      ? [body.tabCategory]
      : [];

  const subCategories = Array.isArray(body.tabSubCategory)
    ? body.tabSubCategory
    : body.tabSubCategory
      ? [body.tabSubCategory]
      : [];

  const maxLength = Math.max(labels.length, categories.length, subCategories.length);
  const result = [];

  for (let i = 0; i < maxLength; i += 1) {
    const label = String(labels[i] || '').trim();
    const category = String(categories[i] || '').trim().toLowerCase();
    const subCategory = String(subCategories[i] || '').trim();

    if (!label && !category && !subCategory) continue;

    result.push({
      label,
      category,
      subCategory
    });
  }

  return result;
}

function normalizeManualProductIds(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(v => String(v).trim()).filter(Boolean);
  }

  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function normalizePositionValue(value, fallback) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;

  if (/^-?\d+(\.\d+)?px$/.test(raw)) return raw;
  if (/^-?\d+(\.\d+)?%$/.test(raw)) return raw;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return `${raw}px`;

  return fallback;
}

async function restoreOrderStock(order) {
  if (!order || !order.items || !order.items.length) return;

  for (const item of order.items) {
    if (!item.productId) continue;

    const product = await Product.findById(item.productId);
    if (!product) continue;

    const restoreQty = Math.max(Number(item.quantity) || 0, 0);
    product.stock = Math.max(Number(product.stock || 0) + restoreQty, 0);
    product.status = product.stock > 0 ? 'active' : 'soldout';

    await product.save();
  }
}

router.get('/login', (req, res) => {
  const error = req.query.error || '';
  res.render('admin/login', { error });
});

router.post('/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = (req.body.password || '').trim();

    if (!username || !password) {
      return res.redirect('/admin/login?error=' + encodeURIComponent('아이디와 비밀번호를 입력해주세요.'));
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.redirect('/admin/login?error=' + encodeURIComponent('존재하지 않는 관리자 계정입니다.'));
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.redirect('/admin/login?error=' + encodeURIComponent('비밀번호가 올바르지 않습니다.'));
    }

    req.session.adminId = admin._id.toString();
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error(error);
    res.redirect('/admin/login?error=' + encodeURIComponent('로그인 처리 중 오류가 발생했습니다.'));
  }
});

router.get('/dashboard', checkAdmin, (req, res) => {
  res.render('admin/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.adminId = null;
  res.redirect('/admin/login?error=' + encodeURIComponent('로그아웃되었습니다.'));
});

// 카테고리
router.get('/categories', checkAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });
    res.render('admin/categories', { categories });
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 페이지 오류');
  }
});

router.post('/categories', checkAdmin, async (req, res) => {
  try {
    const name = (req.body.name || '').trim().toLowerCase();

    if (!name) {
      return res.redirect('/admin/categories');
    }

    const exists = await Category.findOne({ name });

    if (!exists) {
      const lastCategory = await Category.findOne().sort({ order: -1 });
      const nextOrder = lastCategory ? lastCategory.order + 1 : 0;

      await Category.create({
        name,
        order: nextOrder
      });
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 추가 오류');
  }
});

router.post('/categories/seed', checkAdmin, async (req, res) => {
  try {
    const defaultCategories = ['outer', 'top', 'bottom', 'best', 'shirt', 'knit', 'setup'];
    const lastCategory = await Category.findOne().sort({ order: -1 });
    let nextOrder = lastCategory ? lastCategory.order + 1 : 0;

    for (const name of defaultCategories) {
      const exists = await Category.findOne({ name });

      if (!exists) {
        await Category.create({
          name,
          order: nextOrder
        });
        nextOrder += 1;
      }
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('기본 카테고리 추가 오류');
  }
});

router.post('/categories/:id/up', checkAdmin, async (req, res) => {
  try {
    const current = await Category.findById(req.params.id);

    if (!current) {
      return res.redirect('/admin/categories');
    }

    const prev = await Category.findOne({
      order: { $lt: current.order }
    }).sort({ order: -1 });

    if (prev) {
      const tempOrder = current.order;
      current.order = prev.order;
      prev.order = tempOrder;

      await current.save();
      await prev.save();
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 순서 변경 오류');
  }
});

router.post('/categories/:id/down', checkAdmin, async (req, res) => {
  try {
    const current = await Category.findById(req.params.id);

    if (!current) {
      return res.redirect('/admin/categories');
    }

    const next = await Category.findOne({
      order: { $gt: current.order }
    }).sort({ order: 1 });

    if (next) {
      const tempOrder = current.order;
      current.order = next.order;
      next.order = tempOrder;

      await current.save();
      await next.save();
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 순서 변경 오류');
  }
});

router.post('/categories/:id/subcategories', checkAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.redirect('/admin/categories');
    }

    const subCategories = String(req.body.subCategories || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    category.subCategories = subCategories;
    await category.save();

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('서브카테고리 저장 오류');
  }
});

router.post('/categories/:id/subcategories/delete', checkAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.redirect('/admin/categories');
    }

    category.subCategories = [];
    await category.save();

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('서브카테고리 삭제 오류');
  }
});

router.post('/categories/:id/banner', checkAdmin, upload.single('bannerImage'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.redirect('/admin/categories');
    }

    if (req.file) {
      category.bannerImage = await saveImagePreserveAnimation(req.file, 'categories', {
        width: 1600,
        fit: 'inside',
        quality: 95
      });
      await category.save();
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 배너 저장 오류');
  }
});

router.post('/categories/:id/banner/delete', checkAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      category.bannerImage = '';
      await category.save();
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 배너 삭제 오류');
  }
});

router.post('/categories/:id/delete', checkAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      await Product.updateMany(
        { category: category.name },
        { $set: { category: '' } }
      );

      await Category.findByIdAndDelete(req.params.id);
    }

    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    for (let i = 0; i < categories.length; i++) {
      categories[i].order = i;
      await categories[i].save();
    }

    res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    res.status(500).send('카테고리 삭제 오류');
  }
});

// 상품 등록
router.get('/products/new', checkAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    res.render('admin/product-form', {
      isEdit: false,
      formAction: '/admin/products',
      product: {},
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 등록 페이지 오류');
  }
});

router.post(
  '/products',
  checkAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'detailImage', maxCount: 1 },
    { name: 'detailImages', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const {
        name,
        category,
        subCategory,
        price,
        oldPrice,
        desc,
        description,
        stock,
        tag,
        status
      } = req.body;

      const normalizedOptions = normalizeOptions(req.body.options);
      const normalizedColors = normalizeColors(req.body.colors);
      const numericStock = Math.max(Number(stock) || 0, 0);
      const uploaded = await getUploadedFiles(req);

      await Product.create({
        name,
        category: (category || '').toLowerCase(),
        subCategory: (subCategory || '').trim(),
        price: Number(price),
        oldPrice: Number(oldPrice || 0),
        desc: description || desc || '',
        options: normalizedOptions,
        colors: normalizedColors,
        image: uploaded.image,
        detailImage: uploaded.detailImage,
        detailImages: uploaded.detailImages,
        stock: numericStock,
        status: status === 'active' ? 'active' : (numericStock > 0 ? 'active' : 'soldout'),
        tag,
        isBest: req.body.isBest === 'on' || req.body.isBest === 'true'
      });

      res.redirect('/admin/products');
    } catch (error) {
      console.error('상품 등록 에러:', error);
      res.status(500).send('상품 등록 오류');
    }
  }
);

// 상품 목록
router.get('/products', checkAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products', { products });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 목록 오류');
  }
});

// 상품 수정 페이지
router.get('/products/:id/edit', checkAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    if (!product) {
      return res.status(404).send('상품이 없습니다');
    }

    res.render('admin/product-form', {
      isEdit: true,
      formAction: `/admin/products/${product._id}/edit`,
      product,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 수정 페이지 오류');
  }
});

// 상품 수정 저장
router.post(
  '/products/:id/edit',
  checkAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'detailImage', maxCount: 1 },
    { name: 'detailImages', maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const {
        name,
        category,
        subCategory,
        price,
        oldPrice,
        desc,
        description,
        stock,
        tag,
        status
      } = req.body;

      const normalizedOptions = normalizeOptions(req.body.options);
      const normalizedColors = normalizeColors(req.body.colors);
      const numericStock = Math.max(Number(stock) || 0, 0);
      const uploaded = await getUploadedFiles(req);

      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).send('상품이 없습니다');
      }

      const updateData = {
        name,
        category: (category || '').toLowerCase(),
        subCategory: (subCategory || '').trim(),
        price: Number(price),
        oldPrice: Number(oldPrice || 0),
        desc: description || desc || '',
        options: normalizedOptions,
        colors: normalizedColors,
        stock: numericStock,
        status: status === 'active' ? 'active' : (numericStock > 0 ? 'active' : 'soldout'),
        tag,
        isBest: req.body.isBest === 'on' || req.body.isBest === 'true'
      };

      if (uploaded.image) {
        updateData.image = uploaded.image;
      }

      if (uploaded.detailImage) {
        updateData.detailImage = uploaded.detailImage;
      }

      if (uploaded.detailImages.length > 0) {
        updateData.detailImages = uploaded.detailImages;
      }

      await Product.findByIdAndUpdate(req.params.id, updateData);
      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);
      res.status(500).send('상품 수정 오류');
    }
  }
);

router.post('/products/:id/best', checkAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.redirect('/admin/products');
    }

    product.isBest = !product.isBest;
    await product.save();

    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('베스트 변경 오류');
  }
});

router.post('/products/:id/delete', checkAdmin, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 삭제 오류');
  }
});

// 주문
router.get('/orders', checkAdmin, async (req, res) => {
  try {
    const status = (req.query.status || '').trim();
    const keyword = (req.query.keyword || '').trim();

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (keyword) {
      filter.$or = [
        { customerName: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } }
      ];

      if (/^[a-f\d]{24}$/i.test(keyword)) {
        filter.$or.push({ _id: keyword });
      }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.render('admin/orders', {
      orders,
      filterStatus: status,
      keyword
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('주문 목록 오류');
  }
});

router.post('/orders/:id/ship', checkAdmin, async (req, res) => {
  try {
    const trackingNumber = (req.body.trackingNumber || '').trim();
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    if (!trackingNumber) {
      return res.redirect('/admin/orders');
    }

    order.status = 'shipping';
    order.trackingNumber = trackingNumber;
    order.shippedAt = new Date();
    order.deliveredAt = null;

    await order.save();
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('배송중 처리 오류');
  }
});

router.post('/orders/:id/deliver', checkAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();

    await order.save();
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('배송완료 처리 오류');
  }
});

router.post('/orders/:id/status', checkAdmin, async (req, res) => {
  try {
    const status = (req.body.status || '').trim();
    const trackingNumber = (req.body.trackingNumber || '').trim();
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    const previousStatus = order.status;

    if (status === 'paid') {
      order.status = 'paid';
      order.trackingNumber = '';
      order.shippedAt = null;
      order.deliveredAt = null;
    } else if (status === 'shipping') {
      order.status = 'shipping';
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }
      if (!order.shippedAt) {
        order.shippedAt = new Date();
      }
      order.deliveredAt = null;
    } else if (status === 'delivered') {
      order.status = 'delivered';
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }
      if (!order.deliveredAt) {
        order.deliveredAt = new Date();
      }
    } else if (status === 'cancelled') {
      order.status = 'cancelled';
      order.shippedAt = null;
      order.deliveredAt = null;
      order.cancelRequestStatus = 'approved';

      if (previousStatus !== 'cancelled') {
        await restoreOrderStock(order);
      }
    } else if (status === 'test') {
      order.status = 'test';
      order.shippedAt = null;
      order.deliveredAt = null;
    } else if (status === 'hidden') {
      order.status = 'hidden';
    }

    await order.save();
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('주문 상태 변경 오류');
  }
});

// 취소요청 승인
router.post('/orders/:id/cancel-approve', checkAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    if (order.cancelRequestStatus !== 'requested') {
      return res.redirect('/admin/orders');
    }

    const previousStatus = order.status;

    order.status = 'cancelled';
    order.cancelRequestStatus = 'approved';
    order.shippedAt = null;
    order.deliveredAt = null;

    if (previousStatus !== 'cancelled') {
      await restoreOrderStock(order);
    }

    await order.save();
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('취소 승인 오류');
  }
});

// 취소요청 반려
router.post('/orders/:id/cancel-reject', checkAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    if (order.cancelRequestStatus !== 'requested') {
      return res.redirect('/admin/orders');
    }

    order.cancelRequestStatus = 'rejected';
    await order.save();

    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('취소 반려 오류');
  }
});

// 테스트주문만 삭제 가능
router.post('/orders/:id/delete', checkAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.redirect('/admin/orders');
    }

    if (order.status !== 'test') {
      return res.status(400).send('테스트주문만 삭제할 수 있습니다.');
    }

    await Order.findByIdAndDelete(req.params.id);
    res.redirect('/admin/orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('주문 삭제 오류');
  }
});

// 홈 섹션 관리
// 홈 섹션 관리
router.get('/home-sections', checkAdmin, async (req, res) => {
  try {
    const homeSections = await HomeSection.find().sort({ order: 1, createdAt: 1 });
    res.render('admin/home-sections', { homeSections });
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 목록 오류');
  }
});

router.get('/home-sections/new', checkAdmin, async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });
    const products = await Product.find().sort({ createdAt: -1 });

    res.render('admin/home-section-form', {
      isEdit: false,
      formAction: '/admin/home-sections',
      homeSection: {
        sectionKey: '',
        sectionType: 'product-grid',
        titleLabel: '',
        title: '',
        description: '',
        moreText: '',
        moreLink: '',
        isVisible: true,
        productSource: 'latest',
        category: '',
        subCategory: '',
        productLimit: 8,
        autoRotate: false,
        rotateSeconds: 4,
        labelTop: '40px',
        labelLeft: '40px',
        titleTop: '110px',
        titleLeft: '40px',
        descTop: '220px',
        descLeft: '40px',
        tabsTop: '330px',
        tabsLeft: '40px',
        tabs: [],
        manualProductIds: []
      },
      categories,
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 등록 페이지 오류');
  }
});

router.post('/home-sections', checkAdmin, async (req, res) => {
  try {
    const lastSection = await HomeSection.findOne().sort({ order: -1 });
    const nextOrder = lastSection ? lastSection.order + 1 : 0;

    const tabs = normalizeHomeSectionTabs(req.body);
    const manualProductIds = normalizeManualProductIds(req.body.manualProductIds);

    await HomeSection.create({
      sectionKey: (req.body.sectionKey || '').trim(),
      sectionType: (req.body.sectionType || 'product-grid').trim(),

      titleLabel: (req.body.titleLabel || '').trim(),
      title: (req.body.title || '').trim(),
      description: (req.body.description || '').trim(),

      moreText: (req.body.moreText || '').trim(),
      moreLink: (req.body.moreLink || '').trim(),

      isVisible: req.body.isVisible === 'on',
      order: nextOrder,

      productSource: (req.body.productSource || 'latest').trim(),
      category: (req.body.category || '').trim().toLowerCase(),
      subCategory: (req.body.subCategory || '').trim(),

      productLimit: Math.max(Number(req.body.productLimit) || 8, 1),
      autoRotate: req.body.autoRotate === 'on',
      rotateSeconds: Math.max(Number(req.body.rotateSeconds) || 4, 1),

      labelTop: (req.body.labelTop || '40px').trim(),
      labelLeft: (req.body.labelLeft || '40px').trim(),
      titleTop: (req.body.titleTop || '110px').trim(),
      titleLeft: (req.body.titleLeft || '40px').trim(),
      descTop: (req.body.descTop || '220px').trim(),
      descLeft: (req.body.descLeft || '40px').trim(),
      tabsTop: (req.body.tabsTop || '330px').trim(),
      tabsLeft: (req.body.tabsLeft || '40px').trim(),

      tabs,
      manualProductIds
    });

    res.redirect('/admin/home-sections');
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 추가 오류');
  }
});

router.get('/home-sections/:id/edit', checkAdmin, async (req, res) => {
  try {
    const homeSection = await HomeSection.findById(req.params.id);
    const categories = await Category.find().sort({ order: 1, createdAt: 1 });
    const products = await Product.find().sort({ createdAt: -1 });

    if (!homeSection) {
      return res.status(404).send('홈 섹션이 없습니다');
    }

    res.render('admin/home-section-form', {
      isEdit: true,
      formAction: `/admin/home-sections/${homeSection._id}/edit`,
      homeSection,
      categories,
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 수정 페이지 오류');
  }
});

router.post('/home-sections/:id/edit', checkAdmin, async (req, res) => {
  try {
    const homeSection = await HomeSection.findById(req.params.id);

    if (!homeSection) {
      return res.status(404).send('홈 섹션이 없습니다');
    }

    const tabs = normalizeHomeSectionTabs(req.body);
    const manualProductIds = normalizeManualProductIds(req.body.manualProductIds);

    homeSection.sectionKey = (req.body.sectionKey || '').trim();
    homeSection.sectionType = (req.body.sectionType || 'product-grid').trim();

    homeSection.titleLabel = (req.body.titleLabel || '').trim();
    homeSection.title = (req.body.title || '').trim();
    homeSection.description = (req.body.description || '').trim();

    homeSection.moreText = (req.body.moreText || '').trim();
    homeSection.moreLink = (req.body.moreLink || '').trim();

    homeSection.isVisible = req.body.isVisible === 'on';

    homeSection.productSource = (req.body.productSource || 'latest').trim();
    homeSection.category = (req.body.category || '').trim().toLowerCase();
    homeSection.subCategory = (req.body.subCategory || '').trim();

    homeSection.productLimit = Math.max(Number(req.body.productLimit) || 8, 1);
    homeSection.autoRotate = req.body.autoRotate === 'on';
    homeSection.rotateSeconds = Math.max(Number(req.body.rotateSeconds) || 4, 1);

    homeSection.labelTop = (req.body.labelTop || '40px').trim();
    homeSection.labelLeft = (req.body.labelLeft || '40px').trim();
    homeSection.titleTop = (req.body.titleTop || '110px').trim();
    homeSection.titleLeft = (req.body.titleLeft || '40px').trim();
    homeSection.descTop = (req.body.descTop || '220px').trim();
    homeSection.descLeft = (req.body.descLeft || '40px').trim();
    homeSection.tabsTop = (req.body.tabsTop || '330px').trim();
    homeSection.tabsLeft = (req.body.tabsLeft || '40px').trim();

    homeSection.tabs = tabs;
    homeSection.manualProductIds = manualProductIds;

    await homeSection.save();

    res.redirect('/admin/home-sections');
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 수정 오류');
  }
});

router.post('/home-sections/:id/delete', checkAdmin, async (req, res) => {
  try {
    await HomeSection.findByIdAndDelete(req.params.id);

    const sections = await HomeSection.find().sort({ order: 1, createdAt: 1 });
    for (let i = 0; i < sections.length; i += 1) {
      sections[i].order = i;
      await sections[i].save();
    }

    res.redirect('/admin/home-sections');
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 삭제 오류');
  }
});

router.post('/home-sections/:id/up', checkAdmin, async (req, res) => {
  try {
    const current = await HomeSection.findById(req.params.id);
    if (!current) return res.redirect('/admin/home-sections');

    const prev = await HomeSection.findOne({
      order: { $lt: current.order }
    }).sort({ order: -1 });

    if (prev) {
      const temp = current.order;
      current.order = prev.order;
      prev.order = temp;

      await current.save();
      await prev.save();
    }

    res.redirect('/admin/home-sections');
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 순서 변경 오류');
  }
});

router.post('/home-sections/:id/down', checkAdmin, async (req, res) => {
  try {
    const current = await HomeSection.findById(req.params.id);
    if (!current) return res.redirect('/admin/home-sections');

    const next = await HomeSection.findOne({
      order: { $gt: current.order }
    }).sort({ order: 1 });

    if (next) {
      const temp = current.order;
      current.order = next.order;
      next.order = temp;

      await current.save();
      await next.save();
    }

    res.redirect('/admin/home-sections');
  } catch (error) {
    console.error(error);
    res.status(500).send('홈 섹션 순서 변경 오류');
  }
});
// 사이트 콘텐츠
router.get('/site-content', checkAdmin, async (req, res) => {
  try {
    let siteContent = await SiteContent.findOne();

    if (!siteContent) {
      siteContent = await SiteContent.create({});
    }

    res.render('admin/site-content', {
      siteContent,
      success: req.query.success || ''
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('사이트 관리 페이지 오류');
  }
});

router.post(
  '/site-content',
  checkAdmin,
  async (req, res) => {
    try {
      let siteContent = await SiteContent.findOne();

      if (!siteContent) {
        siteContent = await SiteContent.create({});
      }

      const footerSns = buildFooterSns(req.body);

      const updateData = {
        philosophyTitle: req.body.philosophyTitle,
        philosophyDesc: req.body.philosophyDesc,
        philosophyKeywords: req.body.philosophyKeywords,

        newSectionTitle: req.body.newSectionTitle,
        newSectionDesc: req.body.newSectionDesc,
        collectionTitle: req.body.collectionTitle,
        collectionDesc: req.body.collectionDesc,
        editorialTitle: req.body.editorialTitle,
        editorialDesc: req.body.editorialDesc,
        aboutTitle: req.body.aboutTitle,
        aboutDesc: req.body.aboutDesc,

        aboutHeroEyebrow: req.body.aboutHeroEyebrow,
        aboutHeroTitle: req.body.aboutHeroTitle,
        aboutHeroDesc: req.body.aboutHeroDesc,
        aboutImageBannerTitle: req.body.aboutImageBannerTitle,
        aboutImageBannerDesc: req.body.aboutImageBannerDesc,
        aboutTextCardLabel: req.body.aboutTextCardLabel,
        aboutTextCardTitle: req.body.aboutTextCardTitle,
        aboutTextCardDesc: req.body.aboutTextCardDesc,
        aboutKeywordTitle: req.body.aboutKeywordTitle,
        aboutKeywordDesc: req.body.aboutKeywordDesc,

        identitySectionLabel: req.body.identitySectionLabel,
        identitySectionTitle: req.body.identitySectionTitle,
        identitySectionDesc: req.body.identitySectionDesc,
        identity1Title: req.body.identity1Title,
        identity1Desc: req.body.identity1Desc,
        identity2Title: req.body.identity2Title,
        identity2Desc: req.body.identity2Desc,
        identity3Title: req.body.identity3Title,
        identity3Desc: req.body.identity3Desc,

        sceneSectionLabel: req.body.sceneSectionLabel,
        sceneSectionTitle: req.body.sceneSectionTitle,
        sceneSectionDesc: req.body.sceneSectionDesc,

        moodSectionLabel: req.body.moodSectionLabel,
        moodSectionTitle: req.body.moodSectionTitle,
        moodSectionDesc: req.body.moodSectionDesc,
        moodCard1Label: req.body.moodCard1Label,
        moodCard1Title: req.body.moodCard1Title,
        moodCard1Desc: req.body.moodCard1Desc,
        moodCard2Label: req.body.moodCard2Label,
        moodCard2Title: req.body.moodCard2Title,
        moodCard2Desc: req.body.moodCard2Desc,
        moodCard3Label: req.body.moodCard3Label,
        moodCard3Title: req.body.moodCard3Title,
        moodCard3Desc: req.body.moodCard3Desc,

        footerBrandName: req.body.footerBrandName,
        footerDesc: req.body.footerDesc,
        footerCsLabel: req.body.footerCsLabel,
        footerCsPhone: req.body.footerCsPhone,
        footerCsTime1: req.body.footerCsTime1,
        footerCsTime2: req.body.footerCsTime2,

        footerBankTitle: req.body.footerBankTitle,
        footerBank1: req.body.footerBank1,
        footerBank2: req.body.footerBank2,
        footerBank3: req.body.footerBank3,
        footerDepositor: req.body.footerDepositor,
        footerBankNotice: req.body.footerBankNotice,

        footerBizTitle: req.body.footerBizTitle,
        footerBizName: req.body.footerBizName,
        footerBizOwner: req.body.footerBizOwner,
        footerBizAddress: req.body.footerBizAddress,
        footerBizNumber: req.body.footerBizNumber,
        footerBizOnline: req.body.footerBizOnline,
        footerBizPrivacyManager: req.body.footerBizPrivacyManager,

        footerCustomerTitle: req.body.footerCustomerTitle,

        footerTermsLink: req.body.footerTermsLink,
        footerPrivacyLink: req.body.footerPrivacyLink,
        footerBizInfoLink: req.body.footerBizInfoLink,

        footerCopyright: req.body.footerCopyright,
        footerSlogan: req.body.footerSlogan,
        footerSns
      };

      await SiteContent.findByIdAndUpdate(siteContent._id, updateData);
      res.redirect('/admin/site-content?success=1');
    } catch (error) {
      console.error(error);
      res.status(500).send('사이트 관리 저장 오류');
    }
  }
);

// 메인 슬라이드 관리
router.get('/hero-slides', checkAdmin, async (req, res) => {
  try {
    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 });
    res.render('admin/hero-slides', { slides });
  } catch (error) {
    console.error(error);
    res.status(500).send('메인 슬라이드 관리 페이지 오류');
  }
});

router.post(
  '/hero-slides',
  checkAdmin,
  upload.fields([
    { name: 'leftImage', maxCount: 1 },
    { name: 'centerImage', maxCount: 1 },
    { name: 'rightImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const lastSlide = await HeroSlide.findOne().sort({ order: -1 });
      const nextOrder = lastSlide ? lastSlide.order + 1 : 0;

      await HeroSlide.create({
        title: req.body.title || '',
        desc: req.body.desc || '',

        mainLabel: req.body.mainLabel || 'DAMORE MAIN VISUAL',
        showMainLabel: req.body.showMainLabel === 'on',

        buttonText: req.body.buttonText || '',
        buttonLink: req.body.buttonLink || '',
        showButton: req.body.showButton === 'on',

        leftLink: req.body.leftLink || '',
        centerLink: req.body.centerLink || '',
        rightLink: req.body.rightLink || '',

        badge1: req.body.badge1 || '',
        badge2: req.body.badge2 || '',
        badge3: req.body.badge3 || '',

        showBadge1: req.body.showBadge1 === 'on',
        showBadge2: req.body.showBadge2 === 'on',
        showBadge3: req.body.showBadge3 === 'on',

        badge1Top: req.body.badge1Top || '82px',
        badge1Left: req.body.badge1Left || '50px',
        badge1Right: req.body.badge1Right || '',
        badge1Bottom: req.body.badge1Bottom || '',

        badge2Top: req.body.badge2Top || '',
        badge2Left: req.body.badge2Left || '70px',
        badge2Right: req.body.badge2Right || '',
        badge2Bottom: req.body.badge2Bottom || '150px',

        badge3Top: req.body.badge3Top || '',
        badge3Left: req.body.badge3Left || '',
        badge3Right: req.body.badge3Right || '46px',
        badge3Bottom: req.body.badge3Bottom || '86px',

        benefit1: req.body.benefit1 || '',
        benefit2: req.body.benefit2 || '',
        benefit3: req.body.benefit3 || '',

        showBenefit1: req.body.showBenefit1 === 'on',
        showBenefit2: req.body.showBenefit2 === 'on',
        showBenefit3: req.body.showBenefit3 === 'on',

        point1: req.body.point1 || '',
        point2: req.body.point2 || '',
        point3: req.body.point3 || '',

        showPoint1: req.body.showPoint1 === 'on',
        showPoint2: req.body.showPoint2 === 'on',
        showPoint3: req.body.showPoint3 === 'on',

        titleTop: req.body.titleTop || '58%',
        titleLeft: req.body.titleLeft || '34px',

        benefitBottom: req.body.benefitBottom || '86px',
        benefitLeft: req.body.benefitLeft || '34px',

        buttonBottom: req.body.buttonBottom || '34px',
        buttonLeft: req.body.buttonLeft || '34px',

        pointBottom: req.body.pointBottom || '34px',
        pointRight: req.body.pointRight || '34px',

        leftImage: req.files?.leftImage?.[0]
          ? await saveImagePreserveAnimation(req.files.leftImage[0], 'hero', {
              width: 1600,
              fit: 'inside',
              quality: 95
            })
          : '',

        centerImage: req.files?.centerImage?.[0]
          ? await saveImagePreserveAnimation(req.files.centerImage[0], 'hero', {
              width: 1600,
              fit: 'inside',
              quality: 95
            })
          : '',

        rightImage: req.files?.rightImage?.[0]
          ? await saveImagePreserveAnimation(req.files.rightImage[0], 'hero', {
              width: 1600,
              fit: 'inside',
              quality: 95
            })
          : '',

        order: nextOrder,
        isActive: req.body.isActive === 'on'
      });

      res.redirect('/admin/hero-slides');
    } catch (error) {
      console.error(error);
      res.status(500).send('메인 슬라이드 추가 오류');
    }
  }
);

router.post(
  '/hero-slides/:id/edit',
  checkAdmin,
  upload.fields([
    { name: 'leftImage', maxCount: 1 },
    { name: 'centerImage', maxCount: 1 },
    { name: 'rightImage', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const slide = await HeroSlide.findById(req.params.id);
      if (!slide) return res.redirect('/admin/hero-slides');

      slide.title = req.body.title || '';
      slide.desc = req.body.desc || '';

      slide.mainLabel = req.body.mainLabel || 'DAMORE MAIN VISUAL';
      slide.showMainLabel = req.body.showMainLabel === 'on';

      slide.buttonText = req.body.buttonText || '';
      slide.buttonLink = req.body.buttonLink || '';
      slide.showButton = req.body.showButton === 'on';

      slide.leftLink = req.body.leftLink || '';
      slide.centerLink = req.body.centerLink || '';
      slide.rightLink = req.body.rightLink || '';

      slide.badge1 = req.body.badge1 || '';
      slide.badge2 = req.body.badge2 || '';
      slide.badge3 = req.body.badge3 || '';

      slide.showBadge1 = req.body.showBadge1 === 'on';
      slide.showBadge2 = req.body.showBadge2 === 'on';
      slide.showBadge3 = req.body.showBadge3 === 'on';

      slide.badge1Top = req.body.badge1Top || '82px';
      slide.badge1Left = req.body.badge1Left || '50px';
      slide.badge1Right = req.body.badge1Right || '';
      slide.badge1Bottom = req.body.badge1Bottom || '';

      slide.badge2Top = req.body.badge2Top || '';
      slide.badge2Left = req.body.badge2Left || '70px';
      slide.badge2Right = req.body.badge2Right || '';
      slide.badge2Bottom = req.body.badge2Bottom || '150px';

      slide.badge3Top = req.body.badge3Top || '';
      slide.badge3Left = req.body.badge3Left || '';
      slide.badge3Right = req.body.badge3Right || '46px';
      slide.badge3Bottom = req.body.badge3Bottom || '86px';

      slide.benefit1 = req.body.benefit1 || '';
      slide.benefit2 = req.body.benefit2 || '';
      slide.benefit3 = req.body.benefit3 || '';

      slide.showBenefit1 = req.body.showBenefit1 === 'on';
      slide.showBenefit2 = req.body.showBenefit2 === 'on';
      slide.showBenefit3 = req.body.showBenefit3 === 'on';

      slide.point1 = req.body.point1 || '';
      slide.point2 = req.body.point2 || '';
      slide.point3 = req.body.point3 || '';

      slide.showPoint1 = req.body.showPoint1 === 'on';
      slide.showPoint2 = req.body.showPoint2 === 'on';
      slide.showPoint3 = req.body.showPoint3 === 'on';

      slide.titleTop = req.body.titleTop || '58%';
      slide.titleLeft = req.body.titleLeft || '34px';

      slide.benefitBottom = req.body.benefitBottom || '86px';
      slide.benefitLeft = req.body.benefitLeft || '34px';

      slide.buttonBottom = req.body.buttonBottom || '34px';
      slide.buttonLeft = req.body.buttonLeft || '34px';

      slide.pointBottom = req.body.pointBottom || '34px';
      slide.pointRight = req.body.pointRight || '34px';

      slide.isActive = req.body.isActive === 'on';

      if (req.files?.leftImage?.[0]) {
        slide.leftImage = await saveImagePreserveAnimation(req.files.leftImage[0], 'hero', {
          width: 1600,
          fit: 'inside',
          quality: 95
        });
      }

      if (req.files?.centerImage?.[0]) {
        slide.centerImage = await saveImagePreserveAnimation(req.files.centerImage[0], 'hero', {
          width: 1600,
          fit: 'inside',
          quality: 95
        });
      }

      if (req.files?.rightImage?.[0]) {
        slide.rightImage = await saveImagePreserveAnimation(req.files.rightImage[0], 'hero', {
          width: 1600,
          fit: 'inside',
          quality: 95
        });
      }

      await slide.save();
      res.redirect('/admin/hero-slides');
    } catch (error) {
      console.error(error);
      res.status(500).send('메인 슬라이드 수정 오류');
    }
  }
);

router.post('/hero-slides/:id/delete', checkAdmin, async (req, res) => {
  try {
    await HeroSlide.findByIdAndDelete(req.params.id);

    const slides = await HeroSlide.find().sort({ order: 1, createdAt: 1 });
    for (let i = 0; i < slides.length; i++) {
      slides[i].order = i;
      await slides[i].save();
    }

    res.redirect('/admin/hero-slides');
  } catch (error) {
    console.error(error);
    res.status(500).send('메인 슬라이드 삭제 오류');
  }
});

router.post('/hero-slides/:id/up', checkAdmin, async (req, res) => {
  try {
    const current = await HeroSlide.findById(req.params.id);
    if (!current) return res.redirect('/admin/hero-slides');

    const prev = await HeroSlide.findOne({ order: { $lt: current.order } }).sort({ order: -1 });

    if (prev) {
      const temp = current.order;
      current.order = prev.order;
      prev.order = temp;
      await current.save();
      await prev.save();
    }

    res.redirect('/admin/hero-slides');
  } catch (error) {
    console.error(error);
    res.status(500).send('메인 슬라이드 순서 변경 오류');
  }
});

router.post('/hero-slides/:id/down', checkAdmin, async (req, res) => {
  try {
    const current = await HeroSlide.findById(req.params.id);
    if (!current) return res.redirect('/admin/hero-slides');

    const next = await HeroSlide.findOne({ order: { $gt: current.order } }).sort({ order: 1 });

    if (next) {
      const temp = current.order;
      current.order = next.order;
      next.order = temp;
      await current.save();
      await next.save();
    }

    res.redirect('/admin/hero-slides');
  } catch (error) {
    console.error(error);
    res.status(500).send('메인 슬라이드 순서 변경 오류');
  }
});

module.exports = router;