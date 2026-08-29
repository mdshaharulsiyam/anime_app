import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, 'Username must be at least 2 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    passkey: {
      type: String,
      required: [true, 'Passkey is required'],
      trim: true,
      minlength: [3, 'Passkey must be at least 3 characters long'],
      maxlength: [50, 'Passkey cannot exceed 50 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
