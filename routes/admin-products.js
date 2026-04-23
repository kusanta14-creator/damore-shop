const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

const Product = require('../models/Product');
const Category = require('../models/Category');

function checkAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/login');
  }
  next();
}

const uploadDir = path.join(__dirname, '../public/uploads/products');
fs.mkdirSync(uploadDir, { recursive: true });

function sanitizeFileName(name) {
  return String(name || 'file')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_가-힣]/g, '');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = sanitizeFileName(path.basename(file.originalname || 'file', ext));
    cb(null, `${Date.now()}-${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 300
  },
  fileFilter: (req, file, cb) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const videoExts = ['.mp4', '.mov', '.webm', '.m4v'];
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (
      ['imageFile', 'subImageFiles', 'detailImageFiles'].includes(file.fieldname) &&
      imageExts.includes(ext)
    ) {
      return cb(null, true);
    }

    if (file.fieldname === 'videoFile' && videoExts.includes(ext)) {
      return cb(null, true);
    }

    return cb(new Error('지원하지 않는 파일 형식입니다.'));
  }
});

function unlinkIfExists(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('파일 삭제 실패:', error);
  }
}

function toPublicPath(file) {
  if (!file) return '';
  return `/uploads/products/${file.filename}`;
}

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeArrayInput(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'undefined' || value === null) return [];
  return [value];
}

function extractExistingArray(bodyValue) {
  return normalizeArrayInput(bodyValue)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function splitCommaValues(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOptionGroup(name, valuesText) {
  const groupName = String(name || '').trim();
  const values = splitLines(valuesText).map((value) => ({
    value,
    isSoldOut: false
  }));

  if (!groupName || values.length === 0) {
    return null;
  }

  return {
    name: groupName,
    values
  };
}

function buildOptionGroupsFromQuickInputs(body, existingProduct = null) {
  const optionGroups = [];

  const colorValues = splitCommaValues(body.colorsInput);
  const sizeValues = splitCommaValues(body.sizesInput);

  if (colorValues.length > 0) {
    optionGroups.push({
      name: '색상',
      values: colorValues.map((value) => ({ value, isSoldOut: false }))
    });
  }

  if (sizeValues.length > 0) {
    optionGroups.push({
      name: '사이즈',
      values: sizeValues.map((value) => ({ value, isSoldOut: false }))
    });
  }

  if (optionGroups.length > 0) {
    return optionGroups;
  }

  const optionGroup1 = buildOptionGroup(body.optionGroup1Name, body.optionGroup1Values);
  const optionGroup2 = buildOptionGroup(body.optionGroup2Name, body.optionGroup2Values);

  if (optionGroup1) optionGroups.push(optionGroup1);
  if (optionGroup2) optionGroups.push(optionGroup2);

  if (optionGroups.length > 0) {
    return optionGroups;
  }

  return existingProduct?.optionGroups || [];
}

function collectAllMediaPaths(product) {
  const result = [];

  if (!product) return result;

  if (product.image) result.push(product.image);
  if (product.video) result.push(product.video);

  (product.subImages || []).forEach((item) => {
    if (item) result.push(item);
  });

  (product.detailImages || []).forEach((item) => {
    if (item) result.push(item);
  });

  return result;
}

function publicPathToAbsolutePath(publicPath) {
  return path.join(__dirname, '../public', String(publicPath || '').replace(/^\//, ''));
}

async function buildProductPayload(req, existingProduct = null) {
  const files = req.files || {};

  const imageFile = files.imageFile?.[0] || null;
  const videoFile = files.videoFile?.[0] || null;
  const subImageFiles = files.subImageFiles || [];
  const detailImageFiles = files.detailImageFiles || [];

  const image = imageFile
    ? toPublicPath(imageFile)
    : String(req.body.image || existingProduct?.image || '').trim();

  const video = videoFile
    ? toPublicPath(videoFile)
    : String(req.body.video || existingProduct?.video || '').trim();

  const existingSubImages = extractExistingArray(req.body.existingSubImages);
  const subImages = subImageFiles.length > 0
    ? subImageFiles.map(toPublicPath)
    : (existingSubImages.length > 0 ? existingSubImages : (existingProduct?.subImages || []));

  const existingDetailImages = extractExistingArray(req.body.existingDetailImages);
  const detailImages = detailImageFiles.length > 0
    ? detailImageFiles.map(toPublicPath)
    : (existingDetailImages.length > 0 ? existingDetailImages : (existingProduct?.detailImages || []));

  const optionGroups = buildOptionGroupsFromQuickInputs(req.body, existingProduct);

  const additionalProducts = normalizeArrayInput(req.body.additionalProducts)
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  return {
    name: String(req.body.name || '').trim(),
    summary: String(req.body.summary || '').trim(),
    desc: String(req.body.desc || '').trim(),
    category: String(req.body.category || '').trim().toLowerCase(),
    subCategory: String(req.body.subCategory || '').trim(),
    tag: String(req.body.tag || '').trim(),
    price: Number(req.body.price || 0),
    oldPrice: Number(req.body.oldPrice || 0),
    image,
    subImages,
    detailImages,
    video,
    optionGroups,
    additionalProducts,
    couponDisplay: {
      enabled: req.body.couponEnabled === 'true',
      label: String(req.body.couponLabel || '').trim()
    },
    isBest: req.body.isBest === 'true',
    status: String(req.body.status || 'onsale').trim(),
    stock: Number(req.body.stock || existingProduct?.stock || 0),
    likeCount: Number(req.body.likeCount || existingProduct?.likeCount || 0),
    viewCount: Number(req.body.viewCount || existingProduct?.viewCount || 0),
    interestCount: Number(req.body.interestCount || existingProduct?.interestCount || 0),
    reviewCount: Number(req.body.reviewCount || existingProduct?.reviewCount || 0),
    shippingFeeText: String(req.body.shippingFeeText || '').trim() || '무료배송',
    modelInfo: String(req.body.modelInfo || existingProduct?.modelInfo || '').trim(),
    guide: {
      wearInfo: {
        season: String(req.body.wearSeason || existingProduct?.guide?.wearInfo?.season || '봄/가을').trim(),
        elasticity: String(req.body.wearElasticity || existingProduct?.guide?.wearInfo?.elasticity || '적당함').trim(),
        thickness: String(req.body.wearThickness || existingProduct?.guide?.wearInfo?.thickness || '적당함').trim(),
        weight: String(req.body.wearWeight || existingProduct?.guide?.wearInfo?.weight || '적당함').trim()
      }
    }
  };
}

router.get('/', checkAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products/index', { products });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 목록 페이지 오류');
  }
});

router.get('/new', checkAdmin, async (req, res) => {
  try {
    const allProducts = await Product.find()
      .select('_id name price image')
      .sort({ createdAt: -1 });

    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    res.render('admin/products/form', {
      mode: 'create',
      product: null,
      allProducts,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 등록 페이지 오류');
  }
});

router.post(
  '/new',
  checkAdmin,
  upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'videoFile', maxCount: 1 },
    { name: 'subImageFiles', maxCount: 20 },
    { name: 'detailImageFiles', maxCount: 50 }
  ]),
  async (req, res) => {
    try {
      const payload = await buildProductPayload(req);
      await Product.create(payload);
      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message || '상품 등록 오류');
    }
  }
);

router.get('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send('상품을 찾을 수 없습니다.');
    }

    const allProducts = await Product.find({
      _id: { $ne: product._id }
    })
      .select('_id name price image')
      .sort({ createdAt: -1 });

    const categories = await Category.find().sort({ order: 1, createdAt: 1 });

    res.render('admin/products/form', {
      mode: 'edit',
      product,
      allProducts,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 수정 페이지 오류');
  }
});

router.post(
  '/:id/edit',
  checkAdmin,
  upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'videoFile', maxCount: 1 },
    { name: 'subImageFiles', maxCount: 20 },
    { name: 'detailImageFiles', maxCount: 50 }
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).send('상품을 찾을 수 없습니다.');
      }

      const oldMedia = collectAllMediaPaths(product);
      const payload = await buildProductPayload(req, product);

      product.name = payload.name;
      product.summary = payload.summary;
      product.desc = payload.desc;
      product.category = payload.category;
      product.subCategory = payload.subCategory;
      product.tag = payload.tag;
      product.price = payload.price;
      product.oldPrice = payload.oldPrice;
      product.image = payload.image;
      product.subImages = payload.subImages;
      product.detailImages = payload.detailImages;
      product.video = payload.video;
      product.optionGroups = payload.optionGroups;
      product.additionalProducts = payload.additionalProducts;
      product.couponDisplay = payload.couponDisplay;
      product.isBest = payload.isBest;
      product.status = payload.status;
      product.stock = payload.stock;
      product.likeCount = payload.likeCount;
      product.viewCount = payload.viewCount;
      product.interestCount = payload.interestCount;
      product.reviewCount = payload.reviewCount;
      product.shippingFeeText = payload.shippingFeeText;
      product.modelInfo = payload.modelInfo;
      product.guide = payload.guide;

      await product.save();

      const newMedia = collectAllMediaPaths(product);
      const newMediaSet = new Set(newMedia);

      oldMedia.forEach((mediaPath) => {
        if (!newMediaSet.has(mediaPath)) {
          unlinkIfExists(publicPathToAbsolutePath(mediaPath));
        }
      });

      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message || '상품 수정 오류');
    }
  }
);

router.post('/:id/delete', checkAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      const mediaPaths = collectAllMediaPaths(product);
      mediaPaths.forEach((mediaPath) => {
        unlinkIfExists(publicPathToAbsolutePath(mediaPath));
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 삭제 오류');
  }
});

module.exports = router;