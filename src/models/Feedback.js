import mongoose from "mongoose";

export const FEEDBACK_TIPOS = ["cifra_errada", "erro_app", "melhoria", "outro"];

const FeedbackSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: FEEDBACK_TIPOS,
      required: true,
    },
    mensagem: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    // Opcional: nome/link da cifra a que o relato se refere
    referencia: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    // Opcional: como o ADM pode responder a pessoa
    contato: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    // Preenchido pelo servidor quando quem envia está logado
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lido: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Feedback = mongoose.model("Feedback", FeedbackSchema);
export default Feedback;
