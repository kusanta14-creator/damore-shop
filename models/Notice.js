const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    // 기존 데이터 호환용
    date: {
      type: String,
      default: ''
    },

    content: {
      type: String,
      trim: true,
      default: ''
    },

    image: {
      type: String,
      trim: true,
      default: ''
    },

    detailImages: {
      type: [String],
      default: []
    },

    isPinned: {
      type: Boolean,
      default: false
    },

    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notice', noticeSchema);