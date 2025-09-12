import mongoose from "mongoose";

const CategoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
  },
});

const Categoria = mongoose.model("Categoria", CategoriaSchema);
export default Categoria;
