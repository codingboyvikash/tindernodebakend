const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    liker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    liked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'dislike', 'superlike'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// A user can swipe on another user only once
likeSchema.index({ liker: 1, liked: 1 }, { unique: true });

const Like = mongoose.model('Like', likeSchema);
module.exports = Like;
