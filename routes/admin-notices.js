const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const Notice = require('../models/Notice');

function checkAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/login');
  }
  next();
}

const uploadDir = path.join(__dirname, '../public/uploads/notices');
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
    fileSize: 1024 * 1024 * 20
  },
  fileFilter: (req, file, cb) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (imageExts.includes(ext)) {
      return cb(null, true);
    }

    return cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  }
});

function toPublicPath(file) {
  if (!file) return '';
  return `/uploads/notices/${file.filename}`;
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

function collectNoticeMedia(notice) {
  const result = [];

  if (!notice) return result;
  if (notice.image) result.push(notice.image);

  (notice.detailImages || []).forEach((item) => {
    if (item) result.push(item);
  });

  return result;
}

async function buildNoticePayload(req, existingNotice = null) {
  const files = req.files || {};
  const imageFile = files.imageFile?.[0] || null;
  const detailImageFiles = files.detailImageFiles || [];

  const image = imageFile
    ? toPublicPath(imageFile)
    : String(req.body.existingImage || existingNotice?.image || '').trim();

  const existingDetailImages = extractExistingArray(req.body.existingDetailImages);
  const detailImages = detailImageFiles.length > 0
    ? detailImageFiles.map(toPublicPath)
    : (existingDetailImages.length > 0 ? existingDetailImages : (existingNotice?.detailImages || []));

  return {
    title: String(req.body.title || '').trim(),
    content: String(req.body.content || '').trim(),
    image,
    detailImages,
    isPinned: req.body.isPinned === 'true',
    isVisible: req.body.isVisible !== 'false'
  };
}

// 목록
router.get('/', checkAdmin, async (req, res) => {
  try {
    const notices = await Notice.find().sort({ isPinned: -1, createdAt: -1 });

    res.render('admin/notices/index', {
      notices
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 목록 페이지 오류');
  }
});

// 작성 페이지
router.get('/new', checkAdmin, (req, res) => {
  res.render('admin/notices/form', {
    mode: 'create',
    notice: null
  });
});

// 작성 처리
router.post(
  '/new',
  checkAdmin,
  upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'detailImageFiles', maxCount: 20 }
  ]),
  async (req, res) => {
    try {
      const payload = await buildNoticePayload(req);

      await Notice.create(payload);

      res.redirect('/admin/notices');
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message || '공지사항 등록 오류');
    }
  }
);

// 수정 페이지
router.get('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).send('공지사항을 찾을 수 없습니다.');
    }

    res.render('admin/notices/form', {
      mode: 'edit',
      notice
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 수정 페이지 오류');
  }
});

// 수정 처리
router.post(
  '/:id/edit',
  checkAdmin,
  upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'detailImageFiles', maxCount: 20 }
  ]),
  async (req, res) => {
    try {
      const notice = await Notice.findById(req.params.id);

      if (!notice) {
        return res.status(404).send('공지사항을 찾을 수 없습니다.');
      }

      const oldMedia = collectNoticeMedia(notice);
      const payload = await buildNoticePayload(req, notice);

      notice.title = payload.title;
      notice.content = payload.content;
      notice.image = payload.image;
      notice.detailImages = payload.detailImages;
      notice.isPinned = payload.isPinned;
      notice.isVisible = payload.isVisible;

      await notice.save();

      const newMedia = collectNoticeMedia(notice);
      const newMediaSet = new Set(newMedia);

      oldMedia.forEach((mediaPath) => {
        if (!newMediaSet.has(mediaPath)) {
          unlinkIfExists(publicPathToAbsolutePath(mediaPath));
        }
      });

      res.redirect('/admin/notices');
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message || '공지사항 수정 오류');
    }
  }
);

// 삭제
router.post('/:id/delete', checkAdmin, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (notice) {
      const mediaPaths = collectNoticeMedia(notice);
      mediaPaths.forEach((mediaPath) => {
        unlinkIfExists(publicPathToAbsolutePath(mediaPath));
      });
    }

    await Notice.findByIdAndDelete(req.params.id);
    res.redirect('/admin/notices');
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 삭제 오류');
  }
});

module.exports = router;