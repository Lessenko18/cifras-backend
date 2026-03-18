import mongoose from "mongoose";

const CifraSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
  // artista: {
  //   type: String,
  //   required: true,
  // },
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
});

const Cifra = mongoose.model("Cifra", CifraSchema);
export default Cifra;
