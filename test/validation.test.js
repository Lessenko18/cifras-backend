import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

const { default: cifraRepository } = await import("../src/repositories/cifra.repositories.js");
const { default: userRepository } = await import("../src/repositories/user.repositories.js");
const { default: playlistRepository } = await import("../src/repositories/playlist.repositories.js");
const { default: cifraRouter } = await import("../src/routes/cifra.router.js");
const { default: playlistRouter } = await import("../src/routes/playlist.router.js");
const { pickCifraFields } = await import("../src/service/cifra.service.js");

const ID = "64b000000000000000000001";
afterEach(() => mock.restoreAll());

function app() {
  const a = express();
  a.use(express.json());
  a.use("/cifra", cifraRouter);
  a.use("/playlist", playlistRouter);
  a.use((err, req, res, next) => res.status(err.statusCode || 500).json({ message: err.message }));
  return a;
}
async function get(path, { method = "GET", body, auth = false } = {}) {
  const server = await new Promise((r) => { const s = http.createServer(app()).listen(0, () => r(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(auth ? { authorization: `Bearer ${jwt.sign({ id: ID }, process.env.JWT_SECRET)}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  } finally {
    server.close();
  }
}

test("GET /cifra: page/limit/ids inválidos dão 400 e nunca chegam ao banco", async () => {
  const find = mock.method(cifraRepository, "getAllCifraRepository", async () => ({ cifras: [], total: 0, pages: 0, page: 0 }));
  for (const qs of ["page=-1", "page=abc", "page=1.5", "limit=abc", "limit=0", "limit=-5", "categorias=nao-e-id", `favoritos=${ID},xx`, "page=1&page=2"]) {
    const res = await get(`/cifra?${qs}`);
    assert.equal(res.status, 400, qs);
  }
  assert.equal(find.mock.callCount(), 0);
});

test("GET /cifra: valores válidos passam, limit alto é reduzido a 100", async () => {
  const find = mock.method(cifraRepository, "getAllCifraRepository", async () => ({ cifras: [], total: 0, pages: 0, page: 0 }));
  assert.equal((await get(`/cifra?page=2&limit=5000&categorias=${ID},${ID}&nome=paz`)).status, 200);
  assert.deepEqual(find.mock.calls[0].arguments[0], {
    nome: "paz", artista: undefined, categorias: [ID, ID], favoritos: undefined, page: 2, limit: 100,
  });
  assert.equal((await get("/cifra")).status, 200);
  assert.equal(find.mock.calls[1].arguments[0].limit, 15);
  assert.equal(find.mock.calls[1].arguments[0].page, 0);
});

test("/cifra/:id e /playlist/:id com id malformado dão 400 (e /insights/home segue funcionando)", async () => {
  const byId = mock.method(cifraRepository, "getCifraByIdRepository", async () => null);
  assert.equal((await get("/cifra/xyz")).status, 400);
  assert.equal((await get("/cifra/xyz/acesso", { method: "POST" })).status, 400);
  assert.equal(byId.mock.callCount(), 0);

  mock.method(userRepository, "getUserByIdRepository", async () => ({ _id: ID, level: "USER" }));
  mock.method(playlistRepository, "getPlaylistByIdRepository", async () => null);
  assert.equal((await get("/playlist/xyz", { auth: true })).status, 400);
  assert.equal((await get("/playlist/xyz/view", { auth: true })).status, 400);

  mock.method(cifraRepository, "getMaisAcessadasMesRepository", async () => []);
  mock.method(cifraRepository, "getMaisAcessadasRepository", async () => []);
  mock.method(cifraRepository, "getNovasRepository", async () => []);
  mock.method(cifraRepository, "getArtistasMaisAcessadosRepository", async () => []);
  assert.equal((await get("/cifra/insights/home?limit=3")).status, 200);
  assert.equal((await get("/cifra/insights/home?limit=abc")).status, 400);
});

test("compartilhar playlist sem lista de e-mails é 400 (antes era 500)", async () => {
  mock.method(userRepository, "getUserByIdRepository", async () => ({ _id: ID, level: "USER" }));
  for (const body of [{}, { emails: "a@a.com" }, { emails: [] }]) {
    assert.equal((await get(`/playlist/${ID}/share`, { method: "POST", body, auth: true })).status, 400);
  }
});

test("corpo de cifra: bpm, categorias e tamanhos são validados", () => {
  assert.throws(() => pickCifraFields({ nome: "x", bpm: 5 }), { statusCode: 400 });
  assert.throws(() => pickCifraFields({ nome: "x", bpm: "abc" }), { statusCode: 400 });
  assert.throws(() => pickCifraFields({ nome: "x", categorias: ["nao-e-id"] }), { statusCode: 400 });
  assert.throws(() => pickCifraFields({ nome: "x".repeat(201) }), { statusCode: 400 });
  assert.throws(() => pickCifraFields({ nome: "x", observacao: "y".repeat(100_001) }), { statusCode: 400 });
  assert.equal(pickCifraFields({ nome: "x", bpm: "120", categorias: [ID] }).bpm, 120);
});
