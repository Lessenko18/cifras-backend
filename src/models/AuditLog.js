import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    // Quem fez (guardamos nome/e-mail também: o usuário pode ser excluído depois)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    actorLevel: { type: String, default: "" },

    // O que foi feito. Ex.: "cifra_excluida", "usuario_editado"
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true }, // cifra | playlist | usuario | categoria | relato
    entityId: { type: String, default: "" },
    // Nome legível do alvo no momento da ação (título da cifra, e-mail do usuário...)
    label: { type: String, default: "" },
    // Detalhes seguros (nunca senhas/tokens): campos alterados, novo nível etc.
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ createdAt: -1 });
// Mantém a coleção enxuta: registros somem sozinhos depois de 180 dias
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
