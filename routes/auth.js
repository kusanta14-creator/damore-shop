const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const User = require('../models/User');
let Admin = null;

try {
  Admin = require('../models/Admin');
} catch (error) {
  console.log('Admin model not found, admin login via normal login is disabled.');
}

function checkGuest(req, res, next) {
  if (req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }

  if (req.session.userId) {
    return res.redirect('/');
  }

  next();
}

// 시작 화면
router.get('/auth', checkGuest, (req, res) => {
  res.render('auth/start');
});

// 카카오 로그인 임시 안내
router.get('/auth/kakao', checkGuest, (req, res) => {
  res.render('auth/social-coming-soon', {
    provider: 'kakao',
    providerLabel: '카카오'
  });
});

// 네이버 로그인 임시 안내
router.get('/auth/naver', checkGuest, (req, res) => {
  res.render('auth/social-coming-soon', {
    provider: 'naver',
    providerLabel: '네이버'
  });
});

router.get('/register', checkGuest, (req, res) => {
  res.render('auth/register');
});

router.post('/register', checkGuest, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const passwordConfirm = (req.body.passwordConfirm || '').trim();

    if (!name || !email || !password || !passwordConfirm) {
      return res.status(400).send('모든 항목을 입력해주세요.');
    }

    if (password !== passwordConfirm) {
      return res.status(400).send('비밀번호 확인이 일치하지 않습니다.');
    }

    if (password.length < 4) {
      return res.status(400).send('비밀번호는 최소 4자 이상이어야 합니다.');
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).send('이미 가입된 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    req.session.userId = user._id.toString();
    req.session.adminId = null;

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('회원가입 오류');
  }
});

router.get('/login', checkGuest, (req, res) => {
  res.render('auth/login');
});

router.post('/login', checkGuest, async (req, res) => {
  try {
    const loginIdRaw = (req.body.email || '').trim();
    const loginIdEmail = loginIdRaw.toLowerCase();
    const password = (req.body.password || '').trim();

    if (!loginIdRaw || !password) {
      return res.status(400).send('이메일과 비밀번호를 입력해주세요.');
    }

    // 1) 일반 회원 로그인
    const user = await User.findOne({ email: loginIdEmail });

    if (user) {
      const isUserMatch = await bcrypt.compare(password, user.password);

      if (!isUserMatch) {
        return res.status(400).send('비밀번호가 올바르지 않습니다.');
      }

      req.session.userId = user._id.toString();
      req.session.adminId = null;

      return res.redirect('/');
    }

    // 2) 관리자 로그인
    if (Admin) {
      const admin = await Admin.findOne({
        $or: [
          { username: loginIdRaw },
          { email: loginIdEmail }
        ]
      });

      if (admin) {
        const isAdminMatch = await bcrypt.compare(password, admin.password);

        if (!isAdminMatch) {
          return res.status(400).send('비밀번호가 올바르지 않습니다.');
        }

        req.session.adminId = admin._id.toString();
        req.session.userId = null;

        return res.redirect('/admin/dashboard');
      }
    }

    return res.status(400).send('가입된 회원이 없습니다.');
  } catch (error) {
    console.error(error);
    res.status(500).send('로그인 오류');
  }
});

router.get('/logout', (req, res) => {
  req.session.userId = null;
  req.session.adminId = null;
  res.redirect('/');
});

module.exports = router;