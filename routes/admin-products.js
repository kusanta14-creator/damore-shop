const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

const Product = require('../models/Product');

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
      [
        'imageFile',
        'subImageFiles',
        'detailImageFiles',
        'washImageFile',
        'sizeGuideImageFile'
      ].includes(file.fieldname) &&
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

function buildSizeTableHeaders(value) {
  return splitCommaValues(value);
}

function buildSizeTableRows(body) {
  const labels = normalizeArrayInput(body.sizeRowLabel);
  const valuesList = normalizeArrayInput(body.sizeRowValues);

  const rows = [];

  const maxLength = Math.max(labels.length, valuesList.length);

  for (let i = 0; i < maxLength; i += 1) {
    const sizeLabel = String(labels[i] || '').trim();
    const values = splitCommaValues(valuesList[i] || '');

    if (!sizeLabel && values.length === 0) continue;

    rows.push({
      sizeLabel,
      values
    });
  }

  return rows;
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

  if (product.guide?.washImage) result.push(product.guide.washImage);
  if (product.guide?.sizeGuideImage) result.push(product.guide.sizeGuideImage);

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
  const washImageFile = files.washImageFile?.[0] || null;
  const sizeGuideImageFile = files.sizeGuideImageFile?.[0] || null;

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

  const washImage = washImageFile
    ? toPublicPath(washImageFile)
    : String(req.body.existingWashImage || existingProduct?.guide?.washImage || '').trim();

  const sizeGuideImage = sizeGuideImageFile
    ? toPublicPath(sizeGuideImageFile)
    : String(req.body.existingSizeGuideImage || existingProduct?.guide?.sizeGuideImage || '').trim();

  const optionGroups = buildOptionGroupsFromQuickInputs(req.body, existingProduct);

  const additionalProducts = normalizeArrayInput(req.body.additionalProducts)
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  const sizeGuideType = String(req.body.sizeGuideType || '').trim();
  const sizeTableHeaders = buildSizeTableHeaders(req.body.sizeTableHeaders);
  const sizeTableRows = buildSizeTableRows(req.body);
  const sizeNotice = String(req.body.sizeNotice || '').trim();

  return {
    name: String(req.body.name || '').trim(),
    summary: String(req.body.summary || '').trim(),
    desc: String(req.body.desc || '').trim(),
    category: String(req.body.category || '').trim(),
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
      sizeGuideType,
      washImage,
      sizeGuideImage,
      sizeTableHeaders,
      sizeTableRows,
      sizeNotice:
        sizeNotice ||
        existingProduct?.guide?.sizeNotice ||
        '- 위의 실측사이즈는 단면의 길이입니다. 참고해 주세요.\n- 사이즈는 측정방법에 따라 1~3cm 정도 오차가 있을 수 있습니다.\n- 제품 색상은 사용자 모니터와 해상도에 따라 실제 색상과 다소 차이가 있을 수 있습니다.',
      wearInfo: {
        season: String(req.body.wearSeason || existingProduct?.guide?.wearInfo?.season || '봄/가을').trim(),
        elasticity: String(req.body.wearElasticity || existingProduct?.guide?.wearInfo?.elasticity || '적당함').trim(),
        thickness: String(req.body.wearThickness || existingProduct?.guide?.wearInfo?.thickness || '적당함').trim(),
        weight: String(req.body.wearWeight || existingProduct?.guide?.wearInfo?.weight || '적당함').trim()
      },
      copyrightNotice: String(req.body.copyrightNotice || '').trim(),
      shippingExchangeReturn: String(req.body.shippingExchangeReturn || '').trim()
    }
  };
}

// 목록
router.get('/', checkAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products/index', { products });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 목록 페이지 오류');
  }
});

// 등록 페이지
router.get('/new', checkAdmin, async (req, res) => {
  try {
    const allProducts = await Product.find()
      .select('_id name price image')
      .sort({ createdAt: -1 });

    res.render('admin/products/form', {
      mode: 'create',
      product: null,
      allProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 등록 페이지 오류');
  }
});

// 등록 처리
router.post(
  '/new',
  checkAdmin,
  upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'videoFile', maxCount: 1 },
    { name: 'subImageFiles', maxCount: 20 },
    { name: 'detailImageFiles', maxCount: 50 },
    { name: 'washImageFile', maxCount: 1 },
    { name: 'sizeGuideImageFile', maxCount: 1 }
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

// 수정 페이지
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

    res.render('admin/products/form', {
      mode: 'edit',
      product,
      allProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('상품 수정 페이지 오류');
  }
});

// 수정 처리
router.post(
  '/:id/edit',
  checkAdmin,
  upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'videoFile', maxCount: 1 },
    { name: 'subImageFiles', maxCount: 20 },
    { name: 'detailImageFiles', maxCount: 50 },
    { name: 'washImageFile', maxCount: 1 },
    { name: 'sizeGuideImageFile', maxCount: 1 }
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

// 삭제
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