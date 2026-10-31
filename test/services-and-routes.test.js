import { test, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret";

const { default: userRepository } = await import("../src/repositories/user.repositories.js");
const { default: cifraRepository } = await import("../src/repositories/cifra.repositories.js");
const { default: playlistRepository } = await import("../src/repositories/playlist.repositories.js");
const { default: favoritoRepository } = await import("../src/repositories/favorito.repositories.js");
const { default: userService } = await import("../src/service/user.service.js");
const authService = await import("../src/service/auth.service.js");
const { default: cifraService } = await import("../src/service/cifra.service.js");
const { default: playlistService } = await import("../src/service/playlist.service.js");
const { authMiddleware, denyNonAdm } = await import("../src/middlewares/auth.middleware.js");
const { default: authRouter } = await import("../src/routes/auth.router.js");
const { sendError } = await import("../src/utils/httpError.js");

const VALID_ID = "64b000000000000000000001";
const OTHER_ID = "64b000000000000000000002";

beforeEach(() => {
  // Os services falam só com os repositórios: trocamos por stubs, sem banco.
  mock.method(console, "error", () => {});
});
afterEach(() => mock.restoreAll());

async function assertAppError(promise, status, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.statusCode, status, error.message);
    if (code) assert.equal(error.code, code);
    return true;
  });
}

// ---------- auth.service ----------

test("register: valida entrada com 400 e e-mail repetido com 409", async () => {
  mock.method(userRepository, "findUserByEmail", async () => ({ _id: VALID_ID }));
  await assertAppError(authService.register({ name: "A", email: "a@a.com", password: "123456" }), 400);
  await assertAppError(authService.register({ name: "Ana", email: "invalido", password: "123456" }), 400);
  await assertAppError(authService.register({ name: "Ana", email: "a@a.com", password: "123" }), 400);
  await assertAppError(authService.register({ name: "Ana", email: "a@a.com", password: "123456" }), 409, "CONFLICT");
});

test("register: cria sempre com nível USER (cliente não escolhe o papel)", async () => {
  mock.method(userRepository, "findUserByEmail", async () => null);
  const create = mock.method(userRepository, "createUserRepository", async (data) => ({
    _id: VALID_ID,
    ...data,
  }));
  const user = await authService.register({
    name: "Ana",
    email: "ana@a.com",
    password: "123456",
    level: "ADM",
  });
  assert.equal(user.level, "USER");
  assert.equal(create.mock.calls[0].arguments[0].level, "USER");
  assert.notEqual(create.mock.calls[0].arguments[0].password, "123456");
});

test("login: credenciais erradas viram 401, com a mesma mensagem para e-mail inexistente", async () => {
  const hash = await bcrypt.hash("segredo1", 4);
  mock.method(userRepository, "findUserByEmail", async (email) =>
    email === "ana@a.com" ? { _id: VALID_ID, email, level: "USER", password: hash } : null,
  );

  const wrongPassword = await authService.login("ana@a.com", "errada").catch((e) => e);
  const unknownEmail = await authService.login("x@a.com", "segredo1").catch((e) => e);
  assert.equal(wrongPassword.statusCode, 401);
  assert.equal(unknownEmail.statusCode, 401);
  assert.equal(wrongPassword.message, unknownEmail.message);

  const { token } = await authService.login("ana@a.com", "segredo1");
  assert.equal(jwt.verify(token, process.env.JWT_SECRET).id, VALID_ID);
});

test("resetPassword: token desconhecido é 400", async () => {
  mock.method(userRepository, "findUserByResetToken", async () => null);
  await assertAppError(authService.resetPassword("abc", "123456"), 400);
});

// ---------- cifra.service (autorização) ----------

test("cifra: usuário comum só edita/exclui a própria; ADM edita qualquer uma", async () => {
  mock.method(cifraRepository, "getCifraByIdRepository", async () => ({ _id: VALID_ID, createdBy: OTHER_ID }));
  const update = mock.method(cifraRepository, "updateCifraRepository", async () => ({ ok: true }));
  mock.method(cifraRepository, "deleteCifraRepository", async () => {});
  mock.method(playlistRepository, "removeCifraFromAllPlaylists", async () => {});
  mock.method(favoritoRepository, "deleteFavoritosByCifraRepository", async () => {});

  const stranger = { requesterId: VALID_ID, requesterLevel: "USER" };
  await assertAppError(cifraService.updateCifraService(VALID_ID, { nome: "x" }, stranger), 403, "FORBIDDEN");
  await assertAppError(cifraService.deleteCifraService(VALID_ID, stranger), 403, "FORBIDDEN");
  assert.equal(update.mock.callCount(), 0);

  const owner = { requesterId: OTHER_ID, requesterLevel: "USER" };
  await cifraService.updateCifraService(VALID_ID, { nome: "x" }, owner);
  await cifraService.updateCifraService(VALID_ID, { nome: "y" }, { requesterId: VALID_ID, requesterLevel: "ADM" });
  assert.equal(update.mock.callCount(), 2);
});

test("cifra: excluir também limpa os favoritos dessa cifra", async () => {
  mock.method(cifraRepository, "getCifraByIdRepository", async () => ({ _id: VALID_ID, createdBy: OTHER_ID }));
  mock.method(cifraRepository, "deleteCifraRepository", async () => {});
  mock.method(playlistRepository, "removeCifraFromAllPlaylists", async () => {});
  const cleanup = mock.method(favoritoRepository, "deleteFavoritosByCifraRepository", async () => {});

  await cifraService.deleteCifraService(VALID_ID, { requesterId: OTHER_ID, requesterLevel: "USER" });
  assert.deepEqual(cleanup.mock.calls[0].arguments, [VALID_ID]);
});

// ---------- favoritos ----------

test("favoritos: cifra inexistente é 404 e não cria favorito órfão", async () => {
  mock.method(cifraRepository, "cifraExistsByIdRepository", async () => false);
  const toggle = mock.method(favoritoRepository, "toggleFavoritoRepository", async () => []);

  await assertAppError(userService.toggleFavoritoService(OTHER_ID, VALID_ID), 404, "NOT_FOUND");
  assert.equal(toggle.mock.callCount(), 0);
});

test("favoritos: toggle e listagem passam pelo repositório da coleção própria", async () => {
  mock.method(cifraRepository, "cifraExistsByIdRepository", async () => true);
  const toggle = mock.method(favoritoRepository, "toggleFavoritoRepository", async () => [VALID_ID]);
  mock.method(favoritoRepository, "listFavoritosRepository", async () => [VALID_ID]);

  assert.deepEqual(await userService.toggleFavoritoService(OTHER_ID, VALID_ID), [VALID_ID]);
  assert.deepEqual(toggle.mock.calls[0].arguments, [OTHER_ID, VALID_ID]);
  assert.deepEqual(await userService.getFavoritosService(OTHER_ID), [VALID_ID]);
});

test("user: excluir usuário apaga os favoritos dele", async () => {
  mock.method(userRepository, "getUserByIdRepository", async () => ({ _id: OTHER_ID }));
  mock.method(userRepository, "deleteUserRepository", async () => {});
  const cleanup = mock.method(favoritoRepository, "deleteFavoritosByUserRepository", async () => {});

  await userService.deleteUserService(OTHER_ID);
  assert.deepEqual(cleanup.mock.calls[0].arguments, [OTHER_ID]);
});

test("cifra: não encontrada é 404 e duplicada é 409; contadores não vêm do cliente", async () => {
  mock.method(cifraRepository, "getCifraByIdRepository", async () => null);
  await assertAppError(cifraService.updateCifraService(VALID_ID, {}, { requesterLevel: "ADM" }), 404, "NOT_FOUND");
  await assertAppError(cifraService.getCifraById(VALID_ID), 404);

  mock.method(cifraRepository, "findDuplicateCifraRepository", async () => ({ _id: VALID_ID }));
  await assertAppError(cifraService.createCifraService({ nome: "A", artista: "B" }, VALID_ID), 409);

  mock.restoreAll();
  mock.method(cifraRepository, "findDuplicateCifraRepository", async () => null);
  const create = mock.method(cifraRepository, "createCifraRepository", async (d) => d);
  await cifraService.createCifraService({ nome: "A", acessos: 9999, createdBy: OTHER_ID }, VALID_ID);
  const saved = create.mock.calls[0].arguments[0];
  assert.equal(saved.acessos, undefined);
  assert.equal(saved.createdBy, VALID_ID);
});

test("cifra: link com esquema perigoso é rejeitado com 400", async () => {
  mock.method(cifraRepository, "findDuplicateCifraRepository", async () => null);
  await assertAppError(
    cifraService.createCifraService({ nome: "A", link: "javascript:alert(1)" }, VALID_ID),
    400,
  );
});

// ---------- playlist.service (acesso) ----------

test("playlist: tom fora do intervalo, id inválido e playlist alheia", async () => {
  await assertAppError(playlistService.setPlaylistTomService("x", VALID_ID, 1, VALID_ID), 400);
  await assertAppError(playlistService.setPlaylistTomService(VALID_ID, VALID_ID, 12, VALID_ID), 400);

  mock.method(playlistRepository, "getPlaylistByIdForReadRepository", async () => null);
  await assertAppError(playlistService.setPlaylistTomService(VALID_ID, VALID_ID, 2, OTHER_ID), 404, "NOT_FOUND");
});

test("playlist: só o criador ou ADM exclui", async () => {
  mock.method(playlistRepository, "getPlaylistByIdRepository", async () => ({
    _id: VALID_ID,
    criador: OTHER_ID,
  }));
  mock.method(playlistRepository, "playlistExistsByIdRepository", async () => true);
  const del = mock.method(playlistRepository, "deletePlaylistRepository", async () => ({ deletedCount: 1 }));

  await assertAppError(playlistService.deletePlaylistService(VALID_ID, VALID_ID, false), 403, "FORBIDDEN");
  assert.equal(del.mock.callCount(), 0);
});

// ---------- middleware + rotas via HTTP ----------

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, () => resolve(server));
  });
}

async function request(server, method, path, { body, token } = {}) {
  const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.get("/admin", authMiddleware, denyNonAdm, (req, res) => res.json({ ok: true }));
  app.get("/boom", (req, res) => sendError(res, new Error("segredo interno")));
  return app;
}

const signFor = (extra = {}) => jwt.sign({ id: VALID_ID, ...extra }, process.env.JWT_SECRET, { expiresIn: "1h" });

test("authMiddleware: sem token 401, token inválido 401, usuário comum em rota ADM 403, ADM 200", async () => {
  const server = await listen(buildApp());
  try {
    assert.equal((await request(server, "GET", "/admin")).status, 401);
    assert.equal((await request(server, "GET", "/admin", { token: "lixo" })).status, 401);

    mock.method(userRepository, "getUserByIdRepository", async () => ({
      _id: VALID_ID,
      level: "USER",
      passwordChangedAt: null,
    }));
    assert.equal((await request(server, "GET", "/admin", { token: signFor() })).status, 403);

    mock.restoreAll();
    mock.method(userRepository, "getUserByIdRepository", async () => ({
      _id: VALID_ID,
      level: "ADM",
      passwordChangedAt: null,
    }));
    assert.equal((await request(server, "GET", "/admin", { token: signFor() })).status, 200);
  } finally {
    server.close();
  }
});

test("authMiddleware: ignora o level do token e invalida sessão anterior à troca de senha", async () => {
  const server = await listen(buildApp());
  try {
    mock.method(userRepository, "getUserByIdRepository", async () => ({
      _id: VALID_ID,
      level: "USER",
      passwordChangedAt: null,
    }));
    // Token forjado dizendo ADM: o nível vem do banco, não do token
    assert.equal((await request(server, "GET", "/admin", { token: signFor({ level: "ADM" }) })).status, 403);

    mock.restoreAll();
    mock.method(userRepository, "getUserByIdRepository", async () => ({
      _id: VALID_ID,
      level: "ADM",
      passwordChangedAt: new Date(Date.now() + 60_000),
    }));
    assert.equal((await request(server, "GET", "/admin", { token: signFor() })).status, 401);
  } finally {
    server.close();
  }
});

test("POST /auth/login: 401 em credenciais ruins e 200 com token nas boas", async () => {
  const hash = await bcrypt.hash("segredo1", 4);
  mock.method(userRepository, "findUserByEmail", async (email) =>
    email === "ana@a.com" ? { _id: VALID_ID, email, level: "USER", password: hash } : null,
  );
  const server = await listen(buildApp());
  try {
    const bad = await request(server, "POST", "/auth/login", { body: { email: "ana@a.com", password: "x" } });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.code, "UNAUTHORIZED");

    const good = await request(server, "POST", "/auth/login", { body: { email: "ana@a.com", password: "segredo1" } });
    assert.equal(good.status, 200);
    assert.ok(good.body.token);
  } finally {
    server.close();
  }
});

test("POST /auth/register: e-mail repetido é 409, bug interno é 500 sem vazar detalhe", async () => {
  mock.method(userRepository, "findUserByEmail", async () => ({ _id: VALID_ID }));
  const server = await listen(buildApp());
  try {
    const dup = await request(server, "POST", "/auth/register", {
      body: { name: "Ana", email: "ana@a.com", password: "123456" },
    });
    assert.equal(dup.status, 409);

    mock.restoreAll();
    mock.method(console, "error", () => {});
    mock.method(userRepository, "findUserByEmail", async () => {
      throw new TypeError("Cannot read properties of undefined");
    });
    const bug = await request(server, "POST", "/auth/register", {
      body: { name: "Ana", email: "ana@a.com", password: "123456" },
    });
    assert.equal(bug.status, 500);
    assert.ok(!JSON.stringify(bug.body).includes("Cannot read"));

    const boom = await request(server, "GET", "/boom");
    assert.equal(boom.status, 500);
    assert.ok(!JSON.stringify(boom.body).includes("segredo interno"));
  } finally {
    server.close();
  }
});
