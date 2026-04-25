const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');

function checkAdmin(req, res, next) {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/login');
  }
  next();
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
router.post('/new', checkAdmin, async (req, res) => {
  try {
    await Notice.create({
      title: String(req.body.title || '').trim(),
      content: String(req.body.content || '').trim(),
      isPinned: req.body.isPinned === 'true',
      isVisible: req.body.isVisible !== 'false'
    });

    res.redirect('/admin/notices');
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 등록 오류');
  }
});

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
router.post('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).send('공지사항을 찾을 수 없습니다.');
    }

    notice.title = String(req.body.title || '').trim();
    notice.content = String(req.body.content || '').trim();
    notice.isPinned = req.body.isPinned === 'true';
    notice.isVisible = req.body.isVisible !== 'false';

    await notice.save();

    res.redirect('/admin/notices');
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 수정 오류');
  }
});

// 삭제
router.post('/:id/delete', checkAdmin, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.redirect('/admin/notices');
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 삭제 오류');
  }
});

module.exports = router;