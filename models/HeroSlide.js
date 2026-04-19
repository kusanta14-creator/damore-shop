const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: ''
    },
    desc: {
      type: String,
      default: ''
    },

    mainLabel: {
      type: String,
      default: 'DAMORE MAIN VISUAL'
    },
    showMainLabel: {
      type: Boolean,
      default: true
    },

    buttonText: {
      type: String,
      default: ''
    },
    buttonLink: {
      type: String,
      default: ''
    },
    showButton: {
      type: Boolean,
      default: true
    },

    leftImage: {
      type: String,
      default: ''
    },
    centerImage: {
      type: String,
      default: ''
    },
    rightImage: {
      type: String,
      default: ''
    },

    leftLink: {
      type: String,
      default: ''
    },
    centerLink: {
      type: String,
      default: ''
    },
    rightLink: {
      type: String,
      default: ''
    },

    badge1: {
      type: String,
      default: ''
    },
    badge2: {
      type: String,
      default: ''
    },
    badge3: {
      type: String,
      default: ''
    },

    showBadge1: {
      type: Boolean,
      default: true
    },
    showBadge2: {
      type: Boolean,
      default: true
    },
    showBadge3: {
      type: Boolean,
      default: true
    },

    badge1Top: {
      type: String,
      default: '82px'
    },
    badge1Left: {
      type: String,
      default: '50px'
    },
    badge1Right: {
      type: String,
      default: ''
    },
    badge1Bottom: {
      type: String,
      default: ''
    },

    badge2Top: {
      type: String,
      default: ''
    },
    badge2Left: {
      type: String,
      default: '70px'
    },
    badge2Right: {
      type: String,
      default: ''
    },
    badge2Bottom: {
      type: String,
      default: '150px'
    },

    badge3Top: {
      type: String,
      default: ''
    },
    badge3Left: {
      type: String,
      default: ''
    },
    badge3Right: {
      type: String,
      default: '46px'
    },
    badge3Bottom: {
      type: String,
      default: '86px'
    },

    benefit1: {
      type: String,
      default: ''
    },
    benefit2: {
      type: String,
      default: ''
    },
    benefit3: {
      type: String,
      default: ''
    },

    showBenefit1: {
      type: Boolean,
      default: true
    },
    showBenefit2: {
      type: Boolean,
      default: true
    },
    showBenefit3: {
      type: Boolean,
      default: true
    },

    point1: {
      type: String,
      default: ''
    },
    point2: {
      type: String,
      default: ''
    },
    point3: {
      type: String,
      default: ''
    },

    showPoint1: {
      type: Boolean,
      default: true
    },
    showPoint2: {
      type: Boolean,
      default: true
    },
    showPoint3: {
      type: Boolean,
      default: true
    },

    order: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HeroSlide', heroSlideSchema);