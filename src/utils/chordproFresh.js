import { createHash } from "node:crypto";

// O ChordPro é derivado do texto original (`observacao`). Para nunca exibir um ChordPro
// velho (ex.: alguém editou o texto por um caminho que não regerou o ChordPro), junto
// dele guardamos o hash do texto de que ele veio. Na saída da API, só vale se o hash
// ainda bate com o texto atual; senão a cifra cai no caminho antigo (texto).

export function hashText(text) {
  return createHash("sha1").update(String(text ?? ""), "utf8").digest("hex");
}

/** ChordPro da cifra, só se estiver em dia com `observacao`; senão undefined. */
export function freshChordPro(cifra) {
  if (!cifra?.chordpro || !cifra?.chordproHash) return undefined;
  return cifra.chordproHash === hashText(cifra.observacao) ? cifra.chordpro : undefined;
}

/** Cópia da cifra pronta para a API: com `chordpro` válido (ou sem) e sem o hash. */
export function withFreshChordPro(cifra) {
  if (!cifra) return cifra;
  const plain = typeof cifra.toObject === "function" ? cifra.toObject() : { ...cifra };
  const chordpro = freshChordPro(plain);
  delete plain.chordproHash;
  if (chordpro) plain.chordpro = chordpro;
  else delete plain.chordpro;
  return plain;
}
