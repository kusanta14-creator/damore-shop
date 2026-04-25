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

// 커뮤니티 메인 진입 시 공지사항으로 이동
router.get('/', (req, res) => {
  return res.redirect('/community/notice');
});

// 공지사항 목록 + 검색 + 페이지네이션
router.get('/notice', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    const keyword = String(req.query.keyword || '').trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 10;

    const filter = {
      isVisible: true
    };

    if (keyword) {
      filter.title = { $regex: keyword, $options: 'i' };
    }

    const totalCount = await Notice.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;

    const notices = await Notice.find(filter)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const pageBlockSize = 5;
    const currentBlock = Math.ceil(currentPage / pageBlockSize);
    const startPage = (currentBlock - 1) * pageBlockSize + 1;
    const endPage = Math.min(startPage + pageBlockSize - 1, totalPages);

    res.render('community/notice', {
      pageTitle: '공지사항',
      notices,
      keyword,
      currentPage,
      totalPages,
      totalCount,
      startPage,
      endPage,
      hasPrevPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
      ...common
    });
  } catch (error) {
    console.error('공지사항 목록 오류 >>>', error);
    res.status(500).send(error.message || '공지사항 페이지 오류');
  }
});

// 공지사항 상세 + 이전글/다음글
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

    const prevNotice = await Notice.findOne({
      isVisible: true,
      createdAt: { $gt: notice.createdAt }
    }).sort({ createdAt: 1 });

    const nextNotice = await Notice.findOne({
      isVisible: true,
      createdAt: { $lt: notice.createdAt }
    }).sort({ createdAt: -1 });

    res.render('community/notice-detail', {
      pageTitle: notice.title,
      notice,
      prevNotice,
      nextNotice,
      ...common
    });
  } catch (error) {
    console.error('공지사항 상세 오류 >>>', error);
    res.status(500).send(error.message || '공지사항 상세 페이지 오류');
  }
});

// 리뷰
router.get('/review', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    res.render('community/review', {
      pageTitle: '리뷰',
      ...common
    });
  } catch (error) {
    console.error('리뷰 페이지 오류 >>>', error);
    res.status(500).send(error.message || '리뷰 페이지 오류');
  }
});

// 이벤트
router.get('/event', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    res.render('community/event', {
      pageTitle: '이벤트',
      ...common
    });
  } catch (error) {
    console.error('이벤트 페이지 오류 >>>', error);
    res.status(500).send(error.message || '이벤트 페이지 오류');
  }
});

// 고객센터
router.get('/customer', async (req, res) => {
  try {
    const common = await getCommonRenderData(req);

    res.render('community/customer', {
      pageTitle: '고객센터',
      ...common
    });
  } catch (error) {
    console.error('고객센터 페이지 오류 >>>', error);
    res.status(500).send(error.message || '고객센터 페이지 오류');
  }
});

module.exports = router;