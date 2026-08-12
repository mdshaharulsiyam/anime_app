import mongoose from 'mongoose';

const animeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    animeId: {
      type: String,
      required: [true, 'animeId is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Anime title is required'],
      trim: true,
    },
    coverImage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped'],
        message: '{VALUE} is not a valid status',
      },
      default: 'watching',
    },
    episodesWatched: {
      type: Number,
      default: 0,
      min: [0, 'Episodes watched cannot be negative'],
    },
    score: {
      type: Number,
      min: [0, 'Score cannot be less than 0'],
      max: [10, 'Score cannot be greater than 10'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure animeId is unique per user
animeSchema.index({ user: 1, animeId: 1 }, { unique: true });

const Anime = mongoose.model('Anime', animeSchema);

export default Anime;
