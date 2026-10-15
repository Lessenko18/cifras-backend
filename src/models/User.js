import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    enum: ["USER", "ADM"],
    required: true,
  },
  avatar: {
    type: String,
  },
  playlists: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
    },
  ],
  favoritos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cifra",
    },
  ],
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
});

const User = mongoose.model("User", UserSchema);
export default User;
