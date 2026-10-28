import mongoose from "mongoose";

// Campos que nunca podem sair em respostas JSON (nem pro próprio usuário)
const SENSITIVE_FIELDS = [
  "password",
  "resetPasswordToken",
  "resetPasswordExpires",
  "passwordChangedAt",
];
const stripSensitive = (doc, ret) => {
  SENSITIVE_FIELDS.forEach((field) => delete ret[field]);
  return ret;
};

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
  // Tokens (JWT) emitidos antes disso deixam de valer — ver auth.middleware
  passwordChangedAt: {
    type: Date,
    default: null,
  },
}, {
  toJSON: { transform: stripSensitive },
  toObject: { transform: stripSensitive },
});

const User = mongoose.model("User", UserSchema);
export default User;
