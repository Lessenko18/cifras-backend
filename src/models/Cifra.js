import mongoose from "mongoose";

const CifraSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  artista: {
    type: String,
    default: "",
  },
  link: {
    type: String,
    required: true,
  },
  observacao: {
    type: String,
  },
  banner: {
    type: String,
  },
  bpm: {
    type: Number,
    min: 20,
    max: 400,
  },
  categorias: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  acessos: {
    type: Number,
    default: 0,
  },
  acessosMes: {
    type: Number,
    default: 0,
  },
  acessosMesRef: {
    type: String,
    default: "",
  },
}, { timestamps: true });

CifraSchema.index({ nome: "text" });
CifraSchema.index({ categorias: 1 });
CifraSchema.index({ acessos: -1 });
CifraSchema.index({ createdAt: -1 });
CifraSchema.index({ acessosMesRef: 1, acessosMes: -1 });

const Cifra = mongoose.model("Cifra", CifraSchema);
export default Cifra;
