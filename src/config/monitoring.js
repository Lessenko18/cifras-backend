import * as Sentry from "@sentry/node";

// Monitoramento de erros (Sentry). Só liga se SENTRY_DSN estiver definido: sem
// ele tudo aqui vira no-op, então dev e testes não mandam nada para fora.
//
// Privacidade: nunca enviamos corpo da requisição (tem senhas), cookies nem
// Authorization. Só rota, método e id do usuário.
let enabled = false;

function scrub(event) {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      for (const name of Object.keys(event.request.headers)) {
        if (/^(authorization|cookie|set-cookie|x-forwarded-for)$/i.test(name)) {
          delete event.request.headers[name];
        }
      }
    }
  }
  return event;
}

export function initMonitoring() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || enabled) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0, // só erros; sem tracing
    beforeSend: scrub,
  });
  enabled = true;
}

export const isMonitoringEnabled = () => enabled;

// Registra um erro inesperado (5xx). Devolve uma Promise que termina quando o
// envio foi descarregado (serverless congela o processo logo após a resposta,
// então quem responde deve aguardá-la), ou null se o monitoramento está desligado.
export function captureError(error, req) {
  if (!enabled) return null;
  try {
    Sentry.withScope((scope) => {
      if (req) {
        scope.setTag("route", `${req.method} ${req.baseUrl || ""}${req.route?.path || ""}`);
        if (req.userId) scope.setUser({ id: String(req.userId) });
      }
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
    return Sentry.flush(2000).catch(() => false);
  } catch {
    return null;
  }
}
