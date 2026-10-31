import { z } from "zod";
import { badRequest } from "../utils/httpError.js";

// Regras de validação de entrada do auth num lugar só (antes eram `if`s no service).
const password = z
  .string({ required_error: "Informe a senha", invalid_type_error: "Informe a senha" })
  .min(6, "A senha deve ter pelo menos 6 caracteres")
  .refine((value) => Buffer.byteLength(value) <= 72, "A senha é muito longa (máximo de 72 caracteres)");

export const registerSchema = z.object({
  name: z
    .string({ invalid_type_error: "Informe um nome válido", required_error: "Informe um nome válido" })
    .trim()
    .min(2, "Informe um nome válido")
    .max(100, "Informe um nome válido"),
  email: z
    .string({ invalid_type_error: "Informe um e-mail válido", required_error: "Informe um e-mail válido" })
    .trim()
    .max(200, "Informe um e-mail válido")
    .email("Informe um e-mail válido"),
  password,
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: "Token é obrigatório", invalid_type_error: "Token é obrigatório" }).min(1, "Token é obrigatório"),
  newPassword: password.refine(Boolean, "Nova senha é obrigatória"),
});

// Valida e devolve o dado limpo; em caso de erro lança 400 com a 1ª mensagem.
export function parseOrThrow(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message || "Dados inválidos", "VALIDATION_ERROR");
  }
  return result.data;
}
