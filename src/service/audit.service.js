import AuditLog from "../models/AuditLog.js";
import Cifra from "../models/Cifra.js";
import Playlist from "../models/Playlist.js";
import User from "../models/User.js";
import Categoria from "../models/Categoria.js";

const LABEL_SOURCES = {
  cifra: [Cifra, "nome"],
  playlist: [Playlist, "nome"],
  usuario: [User, "email"],
  categoria: [Categoria, "nome"],
};

// Busca o nome legível do alvo ANTES de excluí-lo (depois não dá mais).
export async function auditLabel(entity, id) {
  try {
    const [Model, field] = LABEL_SOURCES[entity] || [];
    if (!Model || !id) return "";
    const doc = await Model.findById(id).select(field).lean();
    return doc?.[field] || "";
  } catch {
    return "";
  }
}

// Registra uma ação. Nunca derruba a requisição: se falhar, só loga no servidor.
export function logAudit(req, { action, entity, entityId = "", label = "", meta = null }) {
  const actor = req?.user;
  AuditLog.create({
    actor: actor?._id || null,
    actorName: actor?.name || "",
    actorEmail: actor?.email || "",
    actorLevel: actor?.level || "",
    action,
    entity,
    entityId: String(entityId || ""),
    label: String(label || "").slice(0, 200),
    meta,
    ip: req?.ip || "",
  }).catch((error) => console.error("[AUDIT_LOG_ERROR]", error?.message));
}

export async function listAuditLogs({ page = 0, limit = 30, action, entity, q } = {}) {
  const query = {};
  if (action) query.action = String(action);
  if (entity) query.entity = String(entity);
  if (q) {
    const safe = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { label: { $regex: safe, $options: "i" } },
      { actorName: { $regex: safe, $options: "i" } },
      { actorEmail: { $regex: safe, $options: "i" } },
    ];
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const safePage = Math.max(Number(page) || 0, 0);

  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(safePage * safeLimit).limit(safeLimit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return { items, total, pages: Math.ceil(total / safeLimit), page: safePage };
}
