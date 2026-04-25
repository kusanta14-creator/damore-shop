const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    date: {
      type: String,
      default: ''
    },

    summary: {
      type: String,
      trim: true,
      default: ''
    },

    content: {
      type: String,
      trim: true,
      default: ''
    },

    image: {
      type: String,
      trim: true,
      default: ''
    },

    detailImages: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: ['live', 'done'],
      default: 'live'
    },

    isPinned: {
      type: Boolean,
      default: false
    },

    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Event', eventSchema);