import mongoose from "mongoose";

// Uma linha por (usuário, cifra). Substitui o array `User.favoritos`, que crescia
// sem limite dentro do documento do usuário e era reescrito inteiro a cada toggle.
const FavoritoSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cifra: { type: mongoose.Schema.Types.ObjectId, ref: "Cifra", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Garante que o toggle concorrente nunca duplica; serve também para listar por usuário.
FavoritoSchema.index({ user: 1, cifra: 1 }, { unique: true });
// Limpeza ao excluir uma cifra.
FavoritoSchema.index({ cifra: 1 });

export default mongoose.model("Favorito", FavoritoSchema);
