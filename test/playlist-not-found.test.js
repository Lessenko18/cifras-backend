import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";

const { default: playlistRepository } = await import("../src/repositories/playlist.repositories.js");
const { default: userRepository } = await import("../src/repositories/user.repositories.js");
const { default: playlistService } = await import("../src/service/playlist.service.js");

const ID = "64b000000000000000000001";
afterEach(() => mock.restoreAll());

// Regressão: `notFound` não estava importado e todo "não encontrada" virava
// ReferenceError (500). Aqui exigimos AppError 404 de verdade.
async function expect404(promise) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, "AppError", `esperava AppError, veio ${error.name}: ${error.message}`);
    assert.equal(error.statusCode, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
}

test("playlist inexistente responde 404 em todos os serviços", async () => {
  mock.method(playlistRepository, "getPlaylistViewRepository", async () => null);
  mock.method(playlistRepository, "getPlaylistByIdForReadRepository", async () => null);
  mock.method(playlistRepository, "getPlaylistByIdRepository", async () => null);

  await expect404(playlistService.getPlaylistViewService(ID, ID));
  await expect404(playlistService.updatePlaylistService(ID, {}, ID));
  await expect404(playlistService.getPlaylistById(ID, ID));
  await expect404(playlistService.getPlaylistSharedEmailsService(ID, ID));
  await expect404(playlistService.sharePlaylistService(ID, ["a@a.com"], ID));
  await expect404(playlistService.unsharePlaylistService(ID, ["a@a.com"], ID));
});

test("compartilhar com e-mails inexistentes responde 404", async () => {
  mock.method(playlistRepository, "getPlaylistByIdRepository", async () => ({ _id: ID, sharedWith: [] }));
  mock.method(userRepository, "findUsersByEmailList", async () => []);
  await expect404(playlistService.sharePlaylistService(ID, ["x@x.com"], ID));
  await expect404(playlistService.unsharePlaylistService(ID, ["x@x.com"], ID));
});

test("criar playlist compartilhando com usuário inexistente responde 404", async () => {
  mock.method(userRepository, "findUsersByEmailList", async () => []);
  await expect404(playlistService.createPlaylistService({ nome: "x", sharedWithEmails: ["x@x.com"] }, ID));
});
