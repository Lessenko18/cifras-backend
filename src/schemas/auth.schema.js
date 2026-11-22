import { z } from "zod";
import { badRequest } from "../utils/httpError.js";

// Regras de validação de entrada do auth num lugar só (antes eram `if`s no service).
// Contas antigas têm senha de 6 caracteres e continuam valendo (login, redefinição e troca
// de senha seguem com 6). Só quem se cadastra agora precisa de 8.
export const MIN_PASSWORD_LENGTH = 6;
export const NEW_USER_MIN_PASSWORD_LENGTH = 8;

const passwordWithMin = (min) =>
  z
    .string({ required_error: "Informe a senha", invalid_type_error: "Informe a senha" })
    .min(min, `A senha deve ter pelo menos ${min} caracteres`)
    .refine((value) => Buffer.byteLength(value) <= 72, "A senha é muito longa (máximo de 72 caracteres)");

const password = passwordWithMin(MIN_PASSWORD_LENGTH);

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
  password: passwordWithMin(NEW_USER_MIN_PASSWORD_LENGTH),
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
