const express = require('express');
const router = express.Router();
const upload = require('../config/multer');

const Event = require('../models/Event');

function checkAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/login');
  }
  next();
}

const eventUpload = upload.fields([
  { name: 'imageFile', maxCount: 1 },
  { name: 'detailImageFiles', maxCount: 20 }
]);

function handleUpload(req, res, next) {
  eventUpload(req, res, function (error) {
    if (error) {
      console.error('Cloudinary 업로드 에러:', error);
      return res.status(500).send(error.stack || error.message || String(error));
    }
    next();
  });
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

function getCloudinaryUrl(file) {
  return file?.path || file?.secure_url || file?.url || '';
}

function sendError(res, label, error) {
  console.error(label, error);
  return res.status(500).send(error.stack || error.message || label);
}

async function buildEventPayload(req, existingEvent = null) {
  const files = req.files || {};
  const imageFile = files.imageFile?.[0] || null;
  const detailImageFiles = files.detailImageFiles || [];

  const image = getCloudinaryUrl(imageFile) ||
    String(req.body.existingImage || existingEvent?.image || '').trim();

  const existingDetailImages = extractExistingArray(req.body.existingDetailImages);

  const uploadedDetailImages = detailImageFiles
    .map(getCloudinaryUrl)
    .filter(Boolean);

  const detailImages = uploadedDetailImages.length > 0
    ? uploadedDetailImages
    : (existingDetailImages.length > 0 ? existingDetailImages : (existingEvent?.detailImages || []));

  return {
    title: String(req.body.title || '').trim(),
    summary: String(req.body.summary || '').trim(),
    content: String(req.body.content || '').trim(),
    image,
    detailImages,
    status: String(req.body.status || 'live').trim() === 'done' ? 'done' : 'live',
    isPinned: req.body.isPinned === 'true',
    isVisible: req.body.isVisible !== 'false'
  };
}

router.get('/', checkAdmin, async (req, res) => {
  try {
    const events = await Event.find().sort({ isPinned: -1, createdAt: -1 });
    res.render('admin/events/index', { events });
  } catch (error) {
    return sendError(res, '이벤트 목록 페이지 오류', error);
  }
});

router.get('/new', checkAdmin, (req, res) => {
  res.render('admin/events/form', {
    mode: 'create',
    event: null
  });
});

router.post('/new', checkAdmin, handleUpload, async (req, res) => {
  try {
    const payload = await buildEventPayload(req);
    await Event.create(payload);
    res.redirect('/admin/events');
  } catch (error) {
    return sendError(res, '이벤트 등록 오류', error);
  }
});

router.get('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).send('이벤트를 찾을 수 없습니다.');
    }

    res.render('admin/events/form', {
      mode: 'edit',
      event
    });
  } catch (error) {
    return sendError(res, '이벤트 수정 페이지 오류', error);
  }
});

router.post('/:id/edit', checkAdmin, handleUpload, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).send('이벤트를 찾을 수 없습니다.');
    }

    const payload = await buildEventPayload(req, event);

    event.title = payload.title;
    event.summary = payload.summary;
    event.content = payload.content;
    event.image = payload.image;
    event.detailImages = payload.detailImages;
    event.status = payload.status;
    event.isPinned = payload.isPinned;
    event.isVisible = payload.isVisible;

    await event.save();

    res.redirect('/admin/events');
  } catch (error) {
    return sendError(res, '이벤트 수정 오류', error);
  }
});

router.post('/:id/delete', checkAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.redirect('/admin/events');
  } catch (error) {
    return sendError(res, '이벤트 삭제 오류', error);
  }
});

module.exports = router;