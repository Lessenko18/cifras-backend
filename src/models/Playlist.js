import mongoose from "mongoose";

const PlaylistSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  criador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  cifras: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cifra",
    },
  ],
});

const Playlist = mongoose.model("Playlist", PlaylistSchema);
export default Playlist;
