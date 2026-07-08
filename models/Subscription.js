const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ['free', 'plus', 'gold', 'platinum'],
      default: 'free',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    transactionId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
