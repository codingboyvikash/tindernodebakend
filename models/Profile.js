const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Please provide your display name'],
      trim: true,
    },
    photos: {
      type: [String],
      validate: [
        {
          validator: function (val) {
            return val.length <= 9;
          },
          message: 'You can upload up to 9 photos only',
        },
      ],
      default: [],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    birthDate: {
      type: Date,
      required: [true, 'Please provide your date of birth'],
    },
    gender: {
      type: String,
      required: [true, 'Please specify your gender'],
      enum: ['male', 'female', 'other'],
    },
    interestedIn: {
      type: String,
      required: [true, 'Please specify who you are interested in'],
      enum: ['male', 'female', 'everyone'],
    },
    height: {
      type: Number, // in cm
    },
    weight: {
      type: Number, // in kg
    },
    languages: {
      type: [String],
      default: [],
    },
    profession: {
      type: String,
      default: '',
    },
    education: {
      type: String,
      default: '',
    },
    hobbies: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Please provide GPS coordinates'],
      },
    },
    distancePreference: {
      type: Number, // in kilometers
      default: 50,
    },
    minAgePreference: {
      type: Number,
      default: 18,
    },
    maxAgePreference: {
      type: Number,
      default: 100,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    notificationSettings: {
      messages: { type: Boolean, default: true },
      matches: { type: Boolean, default: true },
      likes: { type: Boolean, default: true },
      calls: { type: Boolean, default: true },
    },
    privacySettings: {
      showProfile: { type: Boolean, default: true },
      hideAge: { type: Boolean, default: false },
      hideDistance: { type: Boolean, default: false },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumType: {
      type: String,
      enum: ['free', 'plus', 'gold', 'platinum'],
      default: 'free',
    },
    premiumExpiresAt: {
      type: Date,
    },
    verifiedBadge: {
      type: Boolean,
      default: false,
    },
    relationshipGoals: {
      type: String,
      enum: ['dating', 'marriage', 'friends', 'casual', 'not_sure', ''],
      default: '',
    },
    religion: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geo-spatial index for location-based search
profileSchema.index({ location: '2dsphere' });

// Virtual to calculate age
profileSchema.virtual('age').get(function () {
  if (!this.birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - this.birthDate.getFullYear();
  const m = today.getMonth() - this.birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < this.birthDate.getDate())) {
    age--;
  }
  return age;
});

const Profile = mongoose.model('Profile', profileSchema);
module.exports = Profile;
