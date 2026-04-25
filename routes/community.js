const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Notice = require('../models/Notice');
const SiteContent = require('../models/SiteContent');

async function getCommonRenderData(req) {
  const categories = await Category.find().sort({ order: 1, createdAt: 1 });

  let siteContent = await SiteContent.findOne();
  if (!siteContent) {
    siteContent = await SiteContent.create({});
  }

  return {
    categories,
    category: '',
    currentPath: req.originalUrl || req.path,
    siteContent
  };
}

router.get('/', (req, res) => {
  return res.redirect('/community/notice');
});

router.get('/notice', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    const notices = await Notice.find({ isVisible: true }).sort({
      isPinned: -1,
      createdAt: -1
    });

    res.render('community/notice', {
      pageTitle: '공지사항',
      notices,
      ...common
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 페이지 오류');
  }
});

router.get('/notice/:id', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    const notice = await Notice.findOne({
      _id: req.params.id,
      isVisible: true
    });

    if (!notice) {
      return res.status(404).send('공지사항을 찾을 수 없습니다.');
    }

    res.render('community/notice-detail', {
      pageTitle: notice.title,
      notice,
      ...common
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('공지사항 상세 페이지 오류');
  }
});

router.get('/review', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    res.render('community/review', {
      pageTitle: '리뷰',
      ...common
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('리뷰 페이지 오류');
  }
});

router.get('/event', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    res.render('community/event', {
      pageTitle: '이벤트',
      ...common
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('이벤트 페이지 오류');
  }
});

router.get('/customer', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    res.render('community/customer', {
      pageTitle: '고객센터',
      ...common
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('고객센터 페이지 오류');
  }
});

module.exports = router;