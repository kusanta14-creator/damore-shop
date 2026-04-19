const mongoose = require('mongoose');

const homeSectionTabSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    subCategory: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const homeSectionSchema = new mongoose.Schema(
  {
    sectionKey: { type: String, default: '', trim: true },
    sectionType: {
      type: String,
      enum: ['product-grid', 'product-rank', 'product-slider', 'text-banner'],
      default: 'product-grid'
    },

    titleLabel: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },

    moreText: { type: String, default: '', trim: true },
    moreLink: { type: String, default: '', trim: true },

    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    productSource: {
      type: String,
      enum: ['latest', 'best', 'manual', 'category'],
      default: 'latest'
    },

    category: { type: String, default: '', trim: true },
    subCategory: { type: String, default: '', trim: true },

    productLimit: { type: Number, default: 8 },
    autoRotate: { type: Boolean, default: false },
    rotateSeconds: { type: Number, default: 4 },

    labelTop: { type: String, default: '0px', trim: true },
    labelLeft: { type: String, default: '0px', trim: true },

    titleTop: { type: String, default: '0px', trim: true },
    titleLeft: { type: String, default: '0px', trim: true },

    descTop: { type: String, default: '0px', trim: true },
    descLeft: { type: String, default: '0px', trim: true },

    tabsTop: { type: String, default: '0px', trim: true },
    tabsLeft: { type: String, default: '0px', trim: true },

    tabs: {
      type: [homeSectionTabSchema],
      default: []
    },

    manualProductIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Product',
      default: []
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HomeSection ||
  mongoose.model('HomeSection', homeSectionSchema);