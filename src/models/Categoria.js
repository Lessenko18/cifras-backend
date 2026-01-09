import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

const Categoria = mongoose.model("Categoria", CategoriaSchema);
export default Categoria;
