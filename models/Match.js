const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
    },
  },
  {
    timestamps: true,
  }
);

// Index to find matching records easily
matchSchema.index({ users: 1 });

const Match = mongoose.model('Match', matchSchema);
module.exports = Match;
