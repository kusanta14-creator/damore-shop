const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  return res.redirect('/community/notice');
});

router.get('/notice', (req, res) => {
  res.render('community/notice', {
    pageTitle: '공지사항'
  });
});

router.get('/review', (req, res) => {
  res.render('community/review', {
    pageTitle: '리뷰'
  });
});

router.get('/event', (req, res) => {
  res.render('community/event', {
    pageTitle: '이벤트'
  });
});

router.get('/customer', (req, res) => {
  res.render('community/customer', {
    pageTitle: '고객센터'
  });
});

module.exports = router;