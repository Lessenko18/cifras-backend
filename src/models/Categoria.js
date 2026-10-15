import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categoria",
    default: null,
  },
});

const Categoria = mongoose.model("Categoria", CategoriaSchema);
export default Categoria;
