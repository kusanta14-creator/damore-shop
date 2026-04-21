const mongoose = require('mongoose');

const optionValueSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      trim: true,
      required: true
    },
    isSoldOut: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const optionGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    values: {
      type: [optionValueSchema],
      default: []
    }
  },
  { _id: false }
);

const couponDisplaySchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    label: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const guideSchema = new mongoose.Schema(
  {
    washImage: {
      type: String,
      trim: true,
      default: ''
    },
    sizeGuideImage: {
      type: String,
      trim: true,
      default: ''
    },
    copyrightNotice: {
      type: String,
      trim: true,
      default: ''
    },
    shippingExchangeReturn: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      trim: true,
      default: ''
    },
    desc: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      trim: true,
      default: ''
    },
    subCategory: {
      type: String,
      trim: true,
      default: ''
    },
    tag: {
      type: String,
      trim: true,
      default: ''
    },

    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    oldPrice: {
      type: Number,
      default: 0,
      min: 0
    },

    image: {
      type: String,
      trim: true,
      default: ''
    },
    subImages: {
      type: [String],
      default: []
    },
    detailImages: {
      type: [String],
      default: []
    },
    video: {
      type: String,
      trim: true,
      default: ''
    },

    optionGroups: {
      type: [optionGroupSchema],
      default: []
    },

    additionalProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],

    couponDisplay: {
      type: couponDisplaySchema,
      default: () => ({})
    },

    isBest: {
      type: Boolean,
      default: false
    },

    stock: {
      type: Number,
      default: 0,
      min: 0
    },

    status: {
      type: String,
      enum: ['active', 'soldout', 'hidden', 'onsale'],
      default: 'active'
    },

    likeCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    interestCount: {
      type: Number,
      default: 0,
      min: 0
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    },

    shippingFeeText: {
      type: String,
      trim: true,
      default: '무료배송'
    },

    guide: {
      type: guideSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

productSchema.virtual('discountRate').get(function () {
  if (!this.oldPrice || this.oldPrice <= this.price || this.oldPrice <= 0) {
    return 0;
  }

  return Math.round((1 - this.price / this.oldPrice) * 100);
});

productSchema.virtual('mediaItems').get(function () {
  const items = [];

  if (this.video) {
    items.push({
      type: 'video',
      url: this.video
    });
  }

  if (this.image) {
    items.push({
      type: 'image',
      url: this.image
    });
  }

  if (Array.isArray(this.subImages)) {
    this.subImages.forEach((url) => {
      if (url) {
        items.push({
          type: 'image',
          url
        });
      }
    });
  }

  return items;
});

productSchema.pre('save', function (next) {
  if (Number(this.stock || 0) <= 0) {
    this.stock = 0;
    this.status = 'soldout';
  } else if (this.status === 'soldout') {
    this.status = 'active';
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);