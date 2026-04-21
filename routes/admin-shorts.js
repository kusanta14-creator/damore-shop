const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

const router = express.Router();

const ShortsItem = require('../models/ShortsItem');
const Product = require('../models/Product');

ffmpeg.setFfmpegPath(ffmpegPath);

function checkAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect('/login');
  }
  next();
}

const uploadDir = path.join(__dirname, '../public/uploads/shorts');
const convertedDir = path.join(__dirname, '../public/uploads/shorts');

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(convertedDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const baseName = path
      .basename(file.originalname || 'video', ext)
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_가-힣]/g, '');

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

    cb(new Error('지원하지 않는 영상 형식입니다.'));
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

function convertVideoToMp4(inputPath) {
  return new Promise((resolve, reject) => {
    const outputName = `${Date.now()}-converted.mp4`;
    const outputPath = path.join(convertedDir, outputName);

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

async function buildShortPayload(body, uploadedVideoPublicPath) {
  const productId = String(body.productId || '').trim();
  let product = null;

  if (productId) {
    product = await Product.findById(productId);
  }

  return {
    title: String(body.title || '').trim(),
    brandLabel: 'DAMORE SHORTS',
    video: uploadedVideoPublicPath || '',
    poster: '',
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
    const products = await Product.find().sort({ createdAt: -1 }).limit(300);

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

  try {
    const uploadedVideo = req.file;

    if (!uploadedVideo) {
      return res.status(400).send('영상 파일을 업로드해주세요.');
    }

    uploadedInputPath = uploadedVideo.path;

    const converted = await convertVideoToMp4(uploadedInputPath);
    const payload = await buildShortPayload(req.body, converted.publicPath);

    await ShortsItem.create(payload);

    unlinkIfExists(uploadedInputPath);

    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    unlinkIfExists(uploadedInputPath);
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

    const products = await Product.find().sort({ createdAt: -1 }).limit(300);

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

  try {
    const short = await ShortsItem.findById(req.params.id);
    if (!short) {
      return res.status(404).send('숏폼을 찾을 수 없습니다.');
    }

    const uploadedVideo = req.file;
    let finalVideoPath = short.video || '';

    if (uploadedVideo) {
      uploadedInputPath = uploadedVideo.path;

      const converted = await convertVideoToMp4(uploadedInputPath);
      finalVideoPath = converted.publicPath;

      if (short.video) {
        const oldVideoPath = path.join(__dirname, '../public', short.video.replace(/^\//, ''));
        unlinkIfExists(oldVideoPath);
      }

      unlinkIfExists(uploadedInputPath);
    }

    const payload = await buildShortPayload(req.body, finalVideoPath);

    short.title = payload.title;
    short.brandLabel = payload.brandLabel;
    short.video = payload.video;
    short.poster = '';
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

    if (short && short.video) {
      const videoPath = path.join(__dirname, '../public', short.video.replace(/^\//, ''));
      unlinkIfExists(videoPath);
    }

    await ShortsItem.findByIdAndDelete(req.params.id);
    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 삭제 오류');
  }
});

module.exports = router;