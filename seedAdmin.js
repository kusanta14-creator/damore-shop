const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const Admin = require('./models/Admin');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const existingAdmin = await Admin.findOne({ username: 'admin' });

    if (existingAdmin) {
      console.log('이미 admin 계정이 존재합니다.');
      process.exit();
    }

    const hashedPassword = await bcrypt.hash('1234', 10);

    await Admin.create({
      username: 'admin',
      password: hashedPassword
    });

    console.log('초기 관리자 계정 생성 완료');
    console.log('아이디: admin');
    console.log('비밀번호: 1234');

    process.exit();
  } catch (error) {
    console.error('관리자 생성 오류:', error.message);
    process.exit(1);
  }
};

seedAdmin();