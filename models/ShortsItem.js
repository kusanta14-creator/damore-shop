const mongoose = require('mongoose');

const shortsItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: ''
    },
    brandLabel: {
      type: String,
      default: 'DAMORE SHORTS'
    },
    video: {
      type: String,
      required: true
    },
    poster: {
      type: String,
      default: ''
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShortsItem', shortsItemSchema);