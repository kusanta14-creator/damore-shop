const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

// 🔥 파일명 안전 처리
function sanitizeFileName(name) {
  return String(name || 'file')
    .replace(/\s+/g, '-')           // 공백 제거
    .replace(/[^a-zA-Z0-9-_]/g, ''); // 한글/특수문자 제거
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop();
    const base = sanitizeFileName(file.originalname.split('.')[0]);

    return {
      folder: 'damore',
      public_id: `${Date.now()}-${base}`, // 🔥 핵심
      format: ext,
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

module.exports = upload;