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
  sharedWith: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  banner: {
    type: String,
    default: "",
  },
  // Tom salvo por música nesta playlist: { "<cifraId>": semitons (-11..11) }.
  // Ausente = tom original. Vale para todos que enxergam a playlist.
  // Data do evento (missa, casamento…), opcional: alimenta "Próximo compromisso"
  dataEvento: {
    type: Date,
  },
  // Link público somente leitura (/p/:slug). Ausente = privado.
  publicSlug: {
    type: String,
    unique: true,
    sparse: true,
  },
  toms: {
    type: Map,
    of: Number,
    default: {},
  },
}, { timestamps: true });

const Playlist = mongoose.model("Playlist", PlaylistSchema);
export default Playlist;
  