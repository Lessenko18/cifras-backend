import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

// Servidor falso fazendo o papel do ingest do Sentry: guarda o que receber.
const received = [];
const ingest = await new Promise((resolve) => {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      received.push({ url: req.url, body: Buffer.concat(chunks).toString("utf8") });
      res.writeHead(200, { "content-type": "application/json" }).end("{}");
    });
  }).listen(0, () => resolve(server));
});

process.env.SENTRY_DSN = `http://publickey@127.0.0.1:${ingest.address().port}/1`;
const { initMonitoring, isMonitoringEnabled } = await import("../src/config/monitoring.js");
const { sendError, badRequest } = await import("../src/utils/httpError.js");

function fakeRes(req) {
  return {
    req,
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test("com SENTRY_DSN: erro 5xx é enviado (sem corpo/cookie/senha) e o cliente não vê detalhes", async () => {
  initMonitoring();
  assert.equal(isMonitoringEnabled(), true);
  const originalError = console.error;
  console.error = () => {};
  try {
    // Montados em runtime: o Sentry anexa linhas do código-fonte ao stack trace,
    // e um literal aqui apareceria nelas e daria falso positivo.
    const senha = ["sen", "ha", "xyz", "9"].join("");
    const token = ["tok", "en", "abc", "7"].join("");
    const req = {
      method: "POST", baseUrl: "/auth", route: { path: "/login" }, userId: "u1",
      headers: { authorization: `Bearer ${token}`, cookie: `access_token=${token}` },
      body: { password: senha },
    };
    const res = fakeRes(req);
    await sendError(res, new TypeError("falha interna inesperada"));

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Erro interno do servidor", code: "INTERNAL_ERROR" });

    assert.ok(received.length >= 1, "o Sentry deveria ter recebido o evento");
    const payload = received.map((r) => r.body).join("\n");
    assert.match(payload, /falha interna inesperada/);
    assert.match(payload, /POST \/auth\/login/);
    assert.ok(!payload.includes(senha), "senha vazou para o Sentry");
    assert.ok(!payload.includes(token), "token vazou para o Sentry");
  } finally {
    console.error = originalError;
  }
});

test("erros 4xx (esperados) não vão para o Sentry", async () => {
  const before = received.length;
  const res = fakeRes({ method: "GET", headers: {} });
  await sendError(res, badRequest("entrada ruim"));
  assert.equal(res.statusCode, 400);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(received.length, before);
});

test.after(() => ingest.close());
