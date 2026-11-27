// Único lugar que decide "quem pode fazer o quê". Controllers e services chamam
// `can(...)` em vez de comparar `level === "ADM"` espalhado pelo código.
//
// Ator: { userId, level }. Recurso: o documento (ou { id } / { userId }) afetado.
// Planos pagos entram aqui depois: uma regra nova nesta tabela (ex.: "tuner:use") que
// consulta os direitos do usuário, sem tocar nos controllers.
import { ROLES } from "./roles.js";

export { ROLES };

const idOf = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};
const same = (a, b) => idOf(a) !== "" && idOf(a) === idOf(b);

export const isAdminLevel = (level) => level === ROLES.ADM;

// Aceita o `req` do Express (usa req.userLevel) ou um ator { level }.
export const isAdmin = (subject) => isAdminLevel(subject?.userLevel ?? subject?.level);

// Ator a partir do `req` (preenchido pelo authMiddleware).
export const actorFromReq = (req) => ({ userId: req.userId, level: req.userLevel });

const ownerOrAdmin = (ownerField) => (actor, resource) =>
  isAdmin(actor) || same(resource?.[ownerField], actor?.userId);

const selfOrAdmin = (actor, resource) => isAdmin(actor) || same(resource?.id, actor?.userId);

const RULES = {
  "cifra:edit": ownerOrAdmin("createdBy"),
  "cifra:delete": ownerOrAdmin("createdBy"),
  "playlist:delete": ownerOrAdmin("criador"),
  "playlist:manage-link": ownerOrAdmin("criador"),
  "user:read": selfOrAdmin,
  "user:update": selfOrAdmin,
  "user:set-level": (actor) => isAdmin(actor),
  "admin:access": (actor) => isAdmin(actor),
};

export function can(action, actor, resource) {
  const rule = RULES[action];
  if (!rule) throw new Error(`Ação desconhecida: ${action}`);
  return Boolean(actor) && rule(actor, resource);
}
