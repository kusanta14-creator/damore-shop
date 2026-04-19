const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    option: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    payment: {
      type: String,
      required: true
    },
    items: {
      type: [orderItemSchema],
      default: []
    },
    totalPrice: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [
        'pending_payment',
        'paid',
        'shipping',
        'delivered',
        'cancelled',
        'test',
        'hidden',
        'payment_failed'
      ],
      default: 'pending_payment'
    },

    trackingNumber: {
      type: String,
      default: ''
    },
    shippedAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },

    cancelRequestStatus: {
      type: String,
      enum: ['none', 'requested', 'rejected', 'approved'],
      default: 'none'
    },
    cancelRequestReason: {
      type: String,
      default: ''
    },

    merchantUid: {
      type: String,
      default: ''
    },
    paymentKey: {
      type: String,
      default: ''
    },
    paymentProvider: {
      type: String,
      default: ''
    },
    paymentMethod: {
      type: String,
      default: ''
    },
    paidAt: {
      type: Date,
      default: null
    },
    paymentFailedAt: {
      type: Date,
      default: null
    },
    failReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Order', orderSchema);