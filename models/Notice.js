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

    // 새 공지 상세 내용
    content: {
      type: String,
      trim: true,
      default: ''
    },

    // 상단 고정 여부
    isPinned: {
      type: Boolean,
      default: false
    },

    // 노출 / 숨김 여부
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