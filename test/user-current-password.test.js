import { test, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const { default: userRepository } = await import("../src/repositories/user.repositories.js");
const { default: userService } = await import("../src/service/user.service.js");

const ID = "64b000000000000000000001";
const hash = await bcrypt.hash("senha-atual", 4);
afterEach(() => mock.restoreAll());

function stubUser() {
  const updated = [];
  const doc = { _id: ID, name: "Ana", email: "ana@a.com", save: async () => {} };
  mock.method(userRepository, "getUserByIdRepository", async () => doc);
  mock.method(userRepository, "getUserWithPasswordRepository", async () => ({ _id: ID, password: hash }));
  mock.method(userRepository, "updateUserRepository", async (id, data) => {
    updated.push(data);
    return { _id: id, ...data };
  });
  return { updated, doc };
}

async function rejectsInvalidCurrent(promise) {
  await assert.rejects(promise, (e) => {
    assert.equal(e.statusCode, 400); // nunca 401: o front desloga em 401
    assert.equal(e.code, "INVALID_CURRENT_PASSWORD");
    return true;
  });
}

test("trocar a própria senha exige a senha atual correta", async () => {
  const { updated } = stubUser();
  const self = { requireCurrentPassword: true };
  await rejectsInvalidCurrent(userService.updateUserService(ID, { password: "nova-senha" }, self));
  await rejectsInvalidCurrent(userService.updateUserService(ID, { password: "nova-senha", currentPassword: "errada" }, self));
  assert.equal(updated.length, 0);

  await userService.updateUserService(ID, { password: "nova-senha", currentPassword: "senha-atual" }, self);
  assert.equal(updated.length, 1);
  assert.ok(await bcrypt.compare("nova-senha", updated[0].password));
  assert.ok(updated[0].passwordChangedAt instanceof Date);
});

test("trocar o próprio e-mail exige a senha atual; reenviar o mesmo e-mail não", async () => {
  const { updated } = stubUser();
  const self = { requireCurrentPassword: true };
  await rejectsInvalidCurrent(userService.updateUserService(ID, { email: "outro@a.com" }, self));

  // Front manda o e-mail sempre; igual ao atual (ignorando caixa) não é troca
  await userService.updateUserService(ID, { name: "Ana B", email: "ANA@a.com" }, self);
  assert.equal(updated.length, 1);

  await userService.updateUserService(ID, { email: "outro@a.com", currentPassword: "senha-atual" }, self);
  assert.equal(updated.length, 2);
});

test("ADM editando OUTRO usuário não precisa da senha atual dele", async () => {
  const { updated } = stubUser();
  await userService.updateUserService(ID, { password: "reset-pelo-adm" }, { allowLevel: true });
  assert.equal(updated.length, 1);
});

test("PUT /profile: trocar e-mail exige senha atual; só o nome não", async () => {
  const { doc } = stubUser();
  await rejectsInvalidCurrent(userService.updateUserProfile(ID, { email: "novo@a.com" }));
  assert.equal(doc.email, "ana@a.com");

  await userService.updateUserProfile(ID, { name: "Ana Maria" });
  assert.equal(doc.name, "Ana Maria");

  await userService.updateUserProfile(ID, { email: "novo@a.com", currentPassword: "senha-atual" });
  assert.equal(doc.email, "novo@a.com");
});
