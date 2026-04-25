const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

async function getCommonRenderData(req) {
  const categories = await Category.find().sort({ order: 1, createdAt: 1 });

  return {
    categories,
    currentPath: req.path.startsWith('/community') ? `/community${req.path === '/' ? '' : req.path}` : req.path
  };
}

router.get('/', (req, res) => {
  return res.redirect('/community/notice');
});

router.get('/notice', async (req, res) => {
  const common = await getCommonRenderData(req);
  res.render('community/notice', {
    pageTitle: '공지사항',
    ...common
  });
});

router.get('/review', async (req, res) => {
  const common = await getCommonRenderData(req);
  res.render('community/review', {
    pageTitle: '리뷰',
    ...common
  });
});

router.get('/event', async (req, res) => {
  const common = await getCommonRenderData(req);
  res.render('community/event', {
    pageTitle: '이벤트',
    ...common
  });
});

router.get('/customer', async (req, res) => {
  const common = await getCommonRenderData(req);
  res.render('community/customer', {
    pageTitle: '고객센터',
    ...common
  });
});

module.exports = router;