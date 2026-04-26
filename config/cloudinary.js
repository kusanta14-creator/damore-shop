const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: '여기너꺼',
  api_key: '여기너꺼',
  api_secret: '여기너꺼',
});

module.exports = cloudinary;