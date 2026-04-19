const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    category: {
      type: String,
      default: ''
    },

    // ✅ 추가 (핵심)
    subCategory: {
      type: String,
      default: ''
    },

    price: {
      type: Number,
      required: true
    },

    oldPrice: {
      type: Number,
      default: 0
    },

    desc: {
      type: String,
      default: ''
    },

    options: {
      type: [String],
      default: []
    },

    colors: {
      type: [String],
      default: []
    },

    image: {
      type: String,
      default: ''
    },

    detailImage: {
      type: String,
      default: ''
    },

    detailImages: {
      type: [String],
      default: []
    },

    stock: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      default: 'active'
    },

    tag: {
      type: String,
      default: ''
    },

    isBest: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);