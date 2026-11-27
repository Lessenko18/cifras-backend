import { createHash } from "node:crypto";
import { CHORDPRO_VERSION } from "./chordpro.js";

// O ChordPro é derivado do texto original (`observacao`). Para nunca exibir um ChordPro
// velho (ex.: alguém editou o texto por um caminho que não regerou o ChordPro), junto
// dele guardamos o hash do texto de que ele veio. Na saída da API, só vale se o hash
// ainda bate com o texto atual; senão a cifra cai no caminho antigo (texto).
//
// O hash também inclui CHORDPRO_VERSION (a versão do parser): ao corrigir o parser, a
// versão sobe e todo ChordPro gerado antes deixa de valer sozinho, em vez de ficar
// "fresco" com a regra velha. `scripts/migrate-chordpro.js` regera os que ficaram.

export function hashText(text) {
  return createHash("sha1").update(String(text ?? ""), "utf8").digest("hex");
}

/** Hash guardado junto do ChordPro: versão do parser + texto de origem. */
export function chordproHash(text) {
  return hashText(`v${CHORDPRO_VERSION}:${String(text ?? "")}`);
}

/** ChordPro da cifra, só se estiver em dia com `observacao`; senão undefined. */
export function freshChordPro(cifra) {
  if (!cifra?.chordpro || !cifra?.chordproHash) return undefined;
  return cifra.chordproHash === chordproHash(cifra.observacao) ? cifra.chordpro : undefined;
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
