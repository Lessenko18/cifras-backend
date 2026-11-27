import { test } from "node:test";
import assert from "node:assert/strict";
import { can, isAdmin, ROLES } from "../src/policies/index.js";

const dono = { userId: "u1", level: ROLES.USER };
const outro = { userId: "u2", level: ROLES.USER };
const adm = { userId: "u3", level: ROLES.ADM };

test("cifra: só o criador ou ADM edita/exclui", () => {
  const cifra = { createdBy: "u1" };
  for (const acao of ["cifra:edit", "cifra:delete"]) {
    assert.equal(can(acao, dono, cifra), true);
    assert.equal(can(acao, adm, cifra), true);
    assert.equal(can(acao, outro, cifra), false);
  }
  assert.equal(can("cifra:edit", outro, { createdBy: undefined }), false);
});

test("playlist: criador pode, populado ou não; outro usuário não", () => {
  assert.equal(can("playlist:delete", dono, { criador: "u1" }), true);
  assert.equal(can("playlist:delete", dono, { criador: { _id: "u1" } }), true);
  assert.equal(can("playlist:manage-link", outro, { criador: "u1" }), false);
  assert.equal(can("playlist:manage-link", adm, { criador: "u1" }), true);
});

test("usuário: o próprio perfil ou ADM; só ADM muda o nível", () => {
  assert.equal(can("user:read", dono, { id: "u1" }), true);
  assert.equal(can("user:read", dono, { id: "u2" }), false);
  assert.equal(can("user:update", adm, { id: "u2" }), true);
  assert.equal(can("user:set-level", dono), false);
  assert.equal(can("user:set-level", adm), true);
});

test("ADM aceita req ou ator; ação desconhecida lança", () => {
  assert.equal(isAdmin({ userLevel: "ADM" }), true);
  assert.equal(isAdmin({ level: "USER" }), false);
  assert.equal(isAdmin(undefined), false);
  assert.throws(() => can("nada:existe", adm, {}));
  assert.equal(can("admin:access", undefined), false);
});
