// Erros da API.
//
// Os services lançam `AppError` (via os atalhos abaixo) com o status HTTP e um
// `code` estável que o front pode usar sem depender do texto da mensagem.
// Qualquer outro erro (bug, queda do banco...) é tratado como 500 e NUNCA tem a
// mensagem devolvida ao cliente.
export class AppError extends Error {
  constructor(message, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message, code = "BAD_REQUEST") => new AppError(message, 400, code);
export const unauthorized = (message, code = "UNAUTHORIZED") => new AppError(message, 401, code);
export const forbidden = (message, code = "FORBIDDEN") => new AppError(message, 403, code);
export const notFound = (message, code = "NOT_FOUND") => new AppError(message, 404, code);
export const conflict = (message, code = "CONFLICT") => new AppError(message, 409, code);

// Converte qualquer erro em { status, message, code }.
export function toHttpError(error) {
  if (error instanceof AppError) {
    return { status: error.statusCode, message: error.message, code: error.code };
  }

  // Erros que já carregam status (multer, erros de e-mail/S3 criados à mão...)
  const explicit = error?.statusCode || error?.status;
  if (Number.isInteger(explicit) && explicit >= 400 && explicit < 600) {
    return { status: explicit, message: error.message, code: error.code };
  }

  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return { status: 400, message: "Dados inválidos", code: "VALIDATION_ERROR" };
  }

  if (error?.code === 11000) {
    return { status: 409, message: "Registro já existe", code: "CONFLICT" };
  }

  return { status: 500, message: "Erro interno do servidor", code: "INTERNAL_ERROR" };
}

// Resposta de erro padrão: sempre JSON { message, code }.
export function sendError(res, error) {
  const { status, message, code } = toHttpError(error);
  if (status >= 500) {
    console.error("[UNHANDLED_ERROR]", { message: error?.message, stack: error?.stack });
  }
  return res.status(status).json({ message, ...(code ? { code } : {}) });
}
