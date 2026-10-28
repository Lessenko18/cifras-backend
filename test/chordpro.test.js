import { test } from "node:test";
import assert from "node:assert/strict";
import { chordProToLegacy, convertAndVerify, legacyToChordPro } from "../src/utils/chordpro.js";

const A_PAZ = [
  "[Primeira Parte]",
  "C       Dm7        Em7  F/G",
  "Deve haver um lugar dentro do seu coração",
  "",
  "[Refrão]",
  "Am7    G",
  "Sinta, chegou o tempo",
].join("\n");

test("converte para ChordPro com o acorde colado na palavra", () => {
  const cp = legacyToChordPro("C      G\nDeve haver um lugar");
  // o G está na coluna 7, dentro de "haver": o acorde vai colado nessa palavra
  assert.equal(cp, "[C]Deve [G]haver um lugar");
});

test("seção vira {comment: ...} e volta como [seção]", () => {
  const { ok, chordpro } = convertAndVerify(A_PAZ);
  assert.equal(ok, true);
  assert.match(chordpro, /^\{comment: Primeira Parte\}$/m);
  assert.match(chordProToLegacy(chordpro), /^\[Refrão\]$/m);
});

test("dois acordes na mesma palavra viram [F#][B]", () => {
  const { ok, chordpro } = convertAndVerify("F# B\naleluia");
  assert.equal(ok, true);
  assert.equal(chordpro, "[F#][B]aleluia");
});

test("linha só de acordes (intro) continua só de acordes", () => {
  const { ok, chordpro } = convertAndVerify("C   G   Am\n\nC       G\nletra aqui");
  assert.equal(ok, true);
  assert.match(chordpro, /^\[C\]   \[G\]   \[Am\]$/m);
});

test("preserva linhas em branco, letra sem acorde e separador de colunas", () => {
  const texto = "só letra\n\n!!!\nC\ncoração";
  const { ok, chordpro } = convertAndVerify(texto);
  assert.equal(ok, true);
  assert.equal(chordpro.split("\n").slice(0, 3).join("|"), "só letra||!!!");
});

test("remove o caractere invisível do Cifra Club antes de converter", () => {
  const { ok, chordpro } = convertAndVerify("​D\nletra");
  assert.equal(ok, true);
  assert.equal(chordpro, "[D]letra");
});

test("[Intro] D  G  A vira rótulo de seção + linha de acordes de verdade", () => {
  const { ok, chordpro } = convertAndVerify("[Intro] D  G  A\n\nC\nletra");
  assert.equal(ok, true);
  assert.equal(chordpro.split("\n").slice(0, 2).join("|"), "{comment: Intro}|[D]  [G]  [A]");
});

test("linha com colchetes que NÃO é acorde ([Obs] repetir 2x) é guardada crua", () => {
  const { ok, chordpro } = convertAndVerify("[Obs] repetir 2x\n\nC\nletra");
  assert.equal(ok, true);
  assert.match(chordpro, /^\{x_linha: \[Obs\] repetir 2x\}$/m);
  assert.equal(chordProToLegacy(chordpro).split("\n")[0], "[Obs] repetir 2x");
});

test("recusa o que for ambíguo em vez de arriscar (letra pareada com acorde e colchetes)", () => {
  const r = convertAndVerify("C\nRefrão [2x] aqui");
  assert.equal(r.ok, false);
  assert.match(r.reason, /\[ \]/);
});

test("recusa texto vazio", () => {
  assert.equal(convertAndVerify("").ok, false);
  assert.equal(convertAndVerify("   ").ok, false);
  assert.equal(convertAndVerify(null).ok, false);
});

test("ida e volta: a tela enxerga o mesmo (mesmos acordes, mesma letra)", () => {
  const { ok, chordpro } = convertAndVerify(A_PAZ);
  assert.equal(ok, true);
  const back = chordProToLegacy(chordpro);
  const chords = (t) => t.split("\n").filter((l) => /^[A-G]/.test(l.trim())).join(" ").split(/\s+/).filter(Boolean);
  assert.deepEqual(chords(back), chords(A_PAZ));
  assert.ok(back.includes("Deve haver um lugar dentro do seu coração"));
});
