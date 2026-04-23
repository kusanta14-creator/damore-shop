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

const sizeTableRowSchema = new mongoose.Schema(
  {
    sizeLabel: {
      type: String,
      trim: true,
      default: ''
    },
    values: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const wearInfoSchema = new mongoose.Schema(
  {
    season: {
      type: String,
      trim: true,
      default: '봄/가을'
    },
    elasticity: {
      type: String,
      trim: true,
      default: '적당함'
    },
    thickness: {
      type: String,
      trim: true,
      default: '적당함'
    },
    weight: {
      type: String,
      trim: true,
      default: '적당함'
    }
  },
  { _id: false }
);

const guideSchema = new mongoose.Schema(
  {
    sizeGuideType: {
      type: String,
      trim: true,
      enum: ['', 'top', 'pants', 'outer', 'skirt', 'dress', 'shoes', 'etc'],
      default: ''
    },

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

    sizeTableHeaders: {
      type: [String],
      default: []
    },

    sizeTableRows: {
      type: [sizeTableRowSchema],
      default: []
    },

    sizeNotice: {
      type: String,
      trim: true,
      default:
        '- 위의 실측사이즈는 단면의 길이입니다. 참고해 주세요.\n- 사이즈는 측정방법에 따라 1~3cm 정도 오차가 있을 수 있습니다.\n- 제품 색상은 사용자 모니터와 해상도에 따라 실제 색상과 다소 차이가 있을 수 있습니다.'
    },

    wearInfo: {
      type: wearInfoSchema,
      default: () => ({})
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

productSchema.virtual('resolvedSizeGuideType').get(function () {
  return this?.guide?.sizeGuideType || '';
});

productSchema.pre('save', function (next) {
  if (Number(this.stock || 0) <= 0) {
    this.stock = 0;
    this.status = 'soldout';
  } else if (this.status === 'soldout') {
    this.status = 'active';
  }

  if (this.guide) {
    if (!Array.isArray(this.guide.sizeTableHeaders)) {
      this.guide.sizeTableHeaders = [];
    }

    if (!Array.isArray(this.guide.sizeTableRows)) {
      this.guide.sizeTableRows = [];
    }
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);