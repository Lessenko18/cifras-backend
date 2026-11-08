import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

const { MongoRateLimitStore, createLimiter } = await import("../src/middlewares/rateLimit.js");

afterEach(() => mock.restoreAll());

function fakeCollection() {
  const docs = new Map();
  return {
    docs,
    createIndex: async () => "ok",
    // Simula o pipeline: soma se a janela vale, senão recomeça.
    findOneAndUpdate: async (filter) => {
      const now = Date.now();
      const cur = docs.get(filter._id);
      const next =
        cur && cur.resetAt.getTime() > now
          ? { ...cur, count: cur.count + 1 }
          : { _id: filter._id, count: 1, resetAt: new Date(now + 1000) };
      docs.set(filter._id, next);
      return next;
    },
    updateOne: async () => ({}),
    deleteOne: async (f) => docs.delete(f._id),
  };
}

test("store sem conexão com o banco falha na hora (sem ficar em buffer)", async () => {
  const store = new MongoRateLimitStore("t");
  store.init({ windowMs: 1000 });
  await assert.rejects(() => store.increment("1.1.1.1"), /indispon/i);
});

test("store usa chave com prefixo e devolve totalHits/resetTime", async () => {
  const col = fakeCollection();
  const store = new MongoRateLimitStore("login", { getCollection: () => col });
  store.init({ windowMs: 1000 });
  assert.equal((await store.increment("ip")).totalHits, 1);
  const second = await store.increment("ip");
  assert.equal(second.totalHits, 2);
  assert.ok(second.resetTime instanceof Date);
  assert.ok(col.docs.has("login:ip"));
});

test("limiter bloqueia após o limite e libera (fail-open) se o banco cair", async () => {
  const app = express();
  let col = null; // null = banco fora do ar
  const getCollection = () => {
    if (!col) throw new Error("fora do ar");
    return col;
  };
  app.get("/x", createLimiter("t", { windowMs: 60_000, limit: 2, standardHeaders: false, legacyHeaders: false, message: { message: "bloqueado" } }, { getCollection }), (req, res) => res.json({ ok: true }));
  const server = await new Promise((r) => { const s = http.createServer(app).listen(0, () => r(s)); });
  const hit = async () => (await fetch(`http://127.0.0.1:${server.address().port}/x`)).status;
  try {
    // Banco fora: passOnStoreError mantém o app no ar
    mock.method(console, "error", () => {});
    assert.equal(await hit(), 200);
    mock.restoreAll();

    col = fakeCollection();
    assert.deepEqual([await hit(), await hit(), await hit()], [200, 200, 429]);
  } finally {
    server.close();
  }
});
