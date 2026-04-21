const mongoose = require('mongoose');

const optionValueSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      trim: true,
      default: ''
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
      default: ''
    },
    values: {
      type: [optionValueSchema],
      default: []
    }
  },
  { _id: false }
);

const guideSchema = new mongoose.Schema(
  {
    washImage: {
      type: String,
      default: ''
    },
    sizeGuideImage: {
      type: String,
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

const productSchema = new mongoose.Schema(
  {
    // 기본 정보
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
    tag: {
      type: String,
      trim: true,
      default: ''
    },

    // 가격 정보
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

    // 미디어
    image: {
      type: String,
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
      default: ''
    },

    // 옵션
    optionGroups: {
      type: [optionGroupSchema],
      default: []
    },

    // 추가 상품 연결
    additionalProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],

    // 혜택/노출
    couponDisplay: {
      type: couponDisplaySchema,
      default: () => ({})
    },
    isBest: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['onsale', 'soldout'],
      default: 'onsale'
    },

    // 통계/보조 데이터
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

    // 배송/안내
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

// 할인율 계산
productSchema.virtual('discountRate').get(function () {
  if (!this.oldPrice || this.oldPrice <= this.price || this.oldPrice <= 0) {
    return 0;
  }

  return Math.round((1 - this.price / this.oldPrice) * 100);
});

// 대표 미디어 묶음
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

module.exports = mongoose.model('Product', productSchema);