const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const Admin = require('./models/Admin');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const username = 'admin';
    const plainPassword = '1234';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log('기존 admin 계정 비밀번호를 1234로 변경했습니다.');
    } else {
      await Admin.create({
        username,
        password: hashedPassword
      });
      console.log('admin / 1234 관리자 계정을 생성했습니다.');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('관리자 계정 생성 오류:', error);
    process.exit(1);
  }
}

run();