// Bloqueia injeção de operadores do MongoDB ($set, $where, "a.b" ...) vindos
// do cliente: remove, em qualquer nível, chaves que começam com "$" ou têm ".".
// Sem isso, um body como {"name":"x","$set":{"level":"ADM"}} chega ao Mongoose
// como operador de update e ignora a allowlist de campos.
const isDangerousKey = (key) => key.startsWith("$") || key.includes(".");

function clean(value) {
  if (Array.isArray(value)) {
    value.forEach(clean);
    return value;
  }

  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (isDangerousKey(key)) {
        delete value[key];
      } else {
        clean(value[key]);
      }
    }
  }

  return value;
}

export function sanitizeRequest(req, res, next) {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  // req.query é getter em algumas versões do Express; limpa as chaves no lugar
  if (req.query) clean(req.query);
  next();
}
