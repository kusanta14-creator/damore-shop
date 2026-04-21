const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const router = express.Router();

const ShortsItem = require('../models/ShortsItem');
const Product = require('../models/Product');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

function checkAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/login');
  }
  next();
}

const uploadDir = path.join(__dirname, '../public/uploads/shorts');
fs.mkdirSync(uploadDir, { recursive: true });

function sanitizeFileName(name) {
  return String(name || 'video')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_가-힣]/g, '');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = sanitizeFileName(path.basename(file.originalname || 'video', ext));
    cb(null, `${Date.now()}-${baseName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 300
  },
  fileFilter: (req, file, cb) => {
    const allowedVideo = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (file.fieldname === 'videoFile' && allowedVideo.includes(ext)) {
      return cb(null, true);
    }

    return cb(new Error('지원하지 않는 영상 형식입니다.'));
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

function publicPathToAbsolutePath(publicPath) {
  return path.join(__dirname, '../public', String(publicPath || '').replace(/^\//, ''));
}

function toPublicPath(file) {
  if (!file) return '';
  return `/uploads/shorts/${file.filename}`;
}

function convertVideoToMp4(inputPath) {
  return new Promise((resolve, reject) => {
    const outputName = `${Date.now()}-converted.mp4`;
    const outputPath = path.join(uploadDir, outputName);

    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-preset medium',
        '-crf 23'
      ])
      .format('mp4')
      .on('end', () => {
        resolve({
          outputPath,
          publicPath: `/uploads/shorts/${outputName}`
        });
      })
      .on('error', (error) => {
        reject(error);
      })
      .save(outputPath);
  });
}

async function buildShortPayload(body, videoPath, existingShort = null) {
  const productId = String(body.productId || '').trim();
  let product = null;

  if (productId) {
    product = await Product.findById(productId);
  }

  return {
    title: String(body.title || '').trim(),
    brandLabel: String(body.brandLabel || existingShort?.brandLabel || 'DAMORE SHORTS').trim() || 'DAMORE SHORTS',
    video: String(videoPath || existingShort?.video || '').trim(),
    poster: product ? (product.image || '') : String(existingShort?.poster || '').trim(),
    link: product ? `/products/${product._id}` : '/about',
    productId: product ? product._id : null,
    productTitle: product ? product.name : '',
    productPrice: product ? `₩${Number(product.price || 0).toLocaleString()}` : '',
    productThumb: product ? (product.image || '') : '',
    sortOrder: Number(body.sortOrder || 0),
    isVisible: body.isVisible === 'true'
  };
}

// 목록
router.get('/', checkAdmin, async (req, res) => {
  try {
    const shorts = await ShortsItem.find()
      .populate('productId')
      .sort({ sortOrder: 1, createdAt: -1 });

    res.render('admin/shorts/index', { shorts });
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 목록 페이지 오류');
  }
});

// 등록 페이지
router.get('/new', checkAdmin, async (req, res) => {
  try {
    const products = await Product.find()
      .select('_id name price image')
      .sort({ createdAt: -1 })
      .limit(300);

    res.render('admin/shorts/form', {
      mode: 'create',
      short: null,
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 등록 페이지 오류');
  }
});

// 등록 처리
router.post('/new', checkAdmin, upload.single('videoFile'), async (req, res) => {
  let uploadedInputPath = '';
  let convertedOutputPath = '';

  try {
    const uploadedVideo = req.file;

    if (!uploadedVideo) {
      return res.status(400).send('영상 파일을 업로드해주세요.');
    }

    uploadedInputPath = uploadedVideo.path;

    const ext = path.extname(uploadedVideo.originalname || '').toLowerCase();
    let finalPublicPath = toPublicPath(uploadedVideo);

    if (ext !== '.mp4') {
      const converted = await convertVideoToMp4(uploadedInputPath);
      convertedOutputPath = converted.outputPath;
      finalPublicPath = converted.publicPath;
      unlinkIfExists(uploadedInputPath);
      uploadedInputPath = '';
    }

    const payload = await buildShortPayload(req.body, finalPublicPath);
    await ShortsItem.create(payload);

    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    unlinkIfExists(uploadedInputPath);
    unlinkIfExists(convertedOutputPath);
    res.status(500).send(error.message || '숏폼 등록 오류');
  }
});

// 수정 페이지
router.get('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const short = await ShortsItem.findById(req.params.id);

    if (!short) {
      return res.status(404).send('숏폼을 찾을 수 없습니다.');
    }

    const products = await Product.find()
      .select('_id name price image')
      .sort({ createdAt: -1 })
      .limit(300);

    res.render('admin/shorts/form', {
      mode: 'edit',
      short,
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 수정 페이지 오류');
  }
});

// 수정 처리
router.post('/:id/edit', checkAdmin, upload.single('videoFile'), async (req, res) => {
  let uploadedInputPath = '';
  let convertedOutputPath = '';

  try {
    const short = await ShortsItem.findById(req.params.id);

    if (!short) {
      return res.status(404).send('숏폼을 찾을 수 없습니다.');
    }

    let finalVideoPath = short.video || '';
    const uploadedVideo = req.file;

    if (uploadedVideo) {
      uploadedInputPath = uploadedVideo.path;

      const ext = path.extname(uploadedVideo.originalname || '').toLowerCase();

      if (ext === '.mp4') {
        finalVideoPath = toPublicPath(uploadedVideo);
      } else {
        const converted = await convertVideoToMp4(uploadedInputPath);
        convertedOutputPath = converted.outputPath;
        finalVideoPath = converted.publicPath;
        unlinkIfExists(uploadedInputPath);
        uploadedInputPath = '';
      }

      if (short.video && short.video !== finalVideoPath) {
        unlinkIfExists(publicPathToAbsolutePath(short.video));
      }
    }

    const payload = await buildShortPayload(req.body, finalVideoPath, short);

    short.title = payload.title;
    short.brandLabel = payload.brandLabel;
    short.video = payload.video;
    short.poster = payload.poster;
    short.link = payload.link;
    short.productId = payload.productId;
    short.productTitle = payload.productTitle;
    short.productPrice = payload.productPrice;
    short.productThumb = payload.productThumb;
    short.sortOrder = payload.sortOrder;
    short.isVisible = payload.isVisible;

    await short.save();

    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    unlinkIfExists(uploadedInputPath);
    unlinkIfExists(convertedOutputPath);
    res.status(500).send(error.message || '숏폼 수정 오류');
  }
});

// 노출/숨김 토글
router.post('/:id/toggle-visible', checkAdmin, async (req, res) => {
  try {
    const short = await ShortsItem.findById(req.params.id);

    if (!short) {
      return res.status(404).send('숏폼을 찾을 수 없습니다.');
    }

    short.isVisible = !short.isVisible;
    await short.save();

    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 노출 상태 변경 오류');
  }
});

// 삭제
router.post('/:id/delete', checkAdmin, async (req, res) => {
  try {
    const short = await ShortsItem.findById(req.params.id);

    if (short?.video) {
      unlinkIfExists(publicPathToAbsolutePath(short.video));
    }

    await ShortsItem.findByIdAndDelete(req.params.id);
    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 삭제 오류');
  }
});

module.exports = router;