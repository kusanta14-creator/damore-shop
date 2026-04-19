const express = require('express');
const router = express.Router();

const ShortForm = require('../models/ShortForm');
const Product = require('../models/Product');

function checkAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.redirect('/admin/login');
  }
  next();
}

// 목록
router.get('/', checkAdmin, async (req, res) => {
  try {
    const shorts = await ShortForm.find()
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
    const products = await Product.find().sort({ createdAt: -1 }).limit(100);

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
router.post('/new', checkAdmin, async (req, res) => {
  try {
    const productId = String(req.body.productId || '').trim();

    const shortData = {
      title: String(req.body.title || '').trim(),
      brandLabel: String(req.body.brandLabel || '').trim() || 'DAMORE SHORTS',
      video: String(req.body.video || '').trim(),
      poster: String(req.body.poster || '').trim(),
      link: String(req.body.link || '').trim() || '/about',
      productId: productId || null,
      productTitle: String(req.body.productTitle || '').trim(),
      productPrice: String(req.body.productPrice || '').trim(),
      productThumb: String(req.body.productThumb || '').trim(),
      sortOrder: Number(req.body.sortOrder || 0),
      isVisible: req.body.isVisible === 'true'
    };

    if (!shortData.video) {
      return res.status(400).send('영상 경로는 필수입니다.');
    }

    await ShortForm.create(shortData);
    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 등록 오류');
  }
});

// 수정 페이지
router.get('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const short = await ShortForm.findById(req.params.id);
    if (!short) {
      return res.status(404).send('숏폼을 찾을 수 없습니다.');
    }

    const products = await Product.find().sort({ createdAt: -1 }).limit(100);

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
router.post('/:id/edit', checkAdmin, async (req, res) => {
  try {
    const short = await ShortForm.findById(req.params.id);
    if (!short) {
      return res.status(404).send('숏폼을 찾을 수 없습니다.');
    }

    const productId = String(req.body.productId || '').trim();

    short.title = String(req.body.title || '').trim();
    short.brandLabel = String(req.body.brandLabel || '').trim() || 'DAMORE SHORTS';
    short.video = String(req.body.video || '').trim();
    short.poster = String(req.body.poster || '').trim();
    short.link = String(req.body.link || '').trim() || '/about';
    short.productId = productId || null;
    short.productTitle = String(req.body.productTitle || '').trim();
    short.productPrice = String(req.body.productPrice || '').trim();
    short.productThumb = String(req.body.productThumb || '').trim();
    short.sortOrder = Number(req.body.sortOrder || 0);
    short.isVisible = req.body.isVisible === 'true';

    if (!short.video) {
      return res.status(400).send('영상 경로는 필수입니다.');
    }

    await short.save();
    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 수정 오류');
  }
});

// 삭제
router.post('/:id/delete', checkAdmin, async (req, res) => {
  try {
    await ShortForm.findByIdAndDelete(req.params.id);
    res.redirect('/admin/shorts');
  } catch (error) {
    console.error(error);
    res.status(500).send('숏폼 삭제 오류');
  }
});

module.exports = router;