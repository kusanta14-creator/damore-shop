const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    order: {
      type: Number,
      default: 0
    },
    bannerImage: {
      type: String,
      default: ''
    },
    subCategories: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);