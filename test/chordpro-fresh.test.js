import { test } from "node:test";
import assert from "node:assert/strict";
import { freshChordPro, hashText, withFreshChordPro } from "../src/utils/chordproFresh.js";

const texto = "C      G\nDeve haver um lugar";
const cifra = (over = {}) => ({
  nome: "A Paz",
  observacao: texto,
  chordpro: "[C]Deve [G]haver um lugar",
  chordproHash: hashText(texto),
  ...over,
});

test("ChordPro em dia (hash bate com o texto) é entregue", () => {
  assert.equal(freshChordPro(cifra()), "[C]Deve [G]haver um lugar");
});

test("texto editado depois: o ChordPro velho NÃO é entregue", () => {
  assert.equal(freshChordPro(cifra({ observacao: texto + "\nmais uma linha" })), undefined);
});

test("sem hash ou sem ChordPro: nada é entregue", () => {
  assert.equal(freshChordPro(cifra({ chordproHash: undefined })), undefined);
  assert.equal(freshChordPro(cifra({ chordpro: undefined })), undefined);
  assert.equal(freshChordPro(null), undefined);
});

test("withFreshChordPro tira o hash e mantém o ChordPro só se estiver em dia", () => {
  const ok = withFreshChordPro(cifra());
  assert.equal(ok.chordpro, "[C]Deve [G]haver um lugar");
  assert.equal("chordproHash" in ok, false);

  const velho = withFreshChordPro(cifra({ observacao: "outro texto" }));
  assert.equal("chordpro" in velho, false);
  assert.equal(velho.observacao, "outro texto");
});

test("withFreshChordPro aceita documento do Mongoose (toObject)", () => {
  const doc = { toObject: () => cifra() };
  assert.equal(withFreshChordPro(doc).chordpro, "[C]Deve [G]haver um lugar");
});

test("o hash muda com qualquer alteração do texto", () => {
  assert.notEqual(hashText("a"), hashText("a "));
  assert.equal(hashText("a"), hashText("a"));
});
