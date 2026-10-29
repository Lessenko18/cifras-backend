// Resposta de erro padrão da API: sempre JSON { message }, com o status que o
// erro carrega (statusCode ou status) ou o `fallbackStatus`.
// Antes, parte dos controllers respondia texto puro e parte JSON.
export function sendError(res, error, fallbackStatus = 400) {
  const status = error?.statusCode || error?.status || fallbackStatus;
  return res.status(status).json({ message: error?.message || "Erro inesperado" });
}
