import { z } from "zod";
import { badRequest } from "../utils/httpError.js";

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string({ required_error: "Identificador inválido", invalid_type_error: "Identificador inválido" })
  .regex(OBJECT_ID_REGEX, "Identificador inválido");

// Uso: router.param("id", validateIdParam). Vale para TODA rota do router com
// `:id`, então um id malformado vira 400 antes de chegar a controller/banco.
export function validateIdParam(req, res, next, id) {
  if (!OBJECT_ID_REGEX.test(String(id))) {
    return next(badRequest("Identificador inválido", "VALIDATION_ERROR"));
  }
  return next();
}

// "a,b,c" -> ["a","b","c"] (vazio/ausente -> undefined), cada item validado.
export const csvOfObjectIds = (max) =>
  z
    .string()
    .transform((value) => value.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(objectIdSchema).max(max, "Itens demais no filtro"))
    .transform((list) => (list.length ? list : undefined));

// Inteiro vindo de query string. Rejeita lixo ("abc", "-1", "1.5", "1e9").
export const queryInt = ({ min, max, fallback, clamp = false }) =>
  z
    .string()
    .regex(/^\d{1,9}$/, "Parâmetro numérico inválido")
    .transform(Number)
    .pipe(z.number().int().min(min))
    .transform((n) => (clamp ? Math.min(n, max) : n))
    .pipe(z.number().max(max, "Parâmetro numérico fora do limite"))
    .optional()
    .transform((n) => n ?? fallback);
