import { test } from "node:test";
import assert from "node:assert/strict";
import { pickCifraFields } from "../src/service/cifra.service.js";

test("só aceita os campos permitidos (contadores e autor vêm do servidor)", () => {
  const out = pickCifraFields({ nome: "A Paz", acessos: 999, createdBy: "x", $set: {} });
  assert.deepEqual(out, { nome: "A Paz" });
});

test("limpa caracteres invisíveis do texto", () => {
  const out = pickCifraFields({ nome: "A​ Paz", observacao: "​C\r\nletra" });
  assert.equal(out.nome, "A Paz");
  assert.equal(out.observacao, "C\nletra");
});

test("link sem esquema ganha https://", () => {
  assert.equal(pickCifraFields({ link: "exemplo.com/x" }).link, "https://exemplo.com/x");
});

test("bloqueia links perigosos (javascript:, data:)", () => {
  assert.throws(() => pickCifraFields({ link: "javascript:alert(1)" }));
  assert.throws(() => pickCifraFields({ link: "data:text/html,x" }));
});

test("link vazio é aceito e limpo", () => {
  assert.equal(pickCifraFields({ link: "   " }).link, "");
});
