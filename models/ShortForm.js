const mongoose = require('mongoose');

const shortFormSchema = new mongoose.Schema(
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
    link: {
      type: String,
      default: '/about'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    productTitle: {
      type: String,
      default: ''
    },
    productPrice: {
      type: String,
      default: ''
    },
    productThumb: {
      type: String,
      default: ''
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

module.exports = mongoose.model('ShortForm', shortFormSchema);