// GERADO por Frontend/scripts/sync-shared.mjs a partir de Frontend/src/utils/chordSyntax.js.
// NÃO edite aqui: edite no Frontend e rode "npm run sync:shared".
// Única definição do que é um acorde escrito em cifra. Parser de linhas, transposição
// e busca de diagrama importam daqui: assim não divergem (já divergiram uma vez, com o
// diminuto "°"). Ao mudar qualquer regra, suba CHORDPRO_VERSION em chordpro.js.

// Diminuto: o certo é "°", mas muita gente digita "º" (ordinal) ou "˚"/"∘".
export const DIM_CHARS = "°º˚∘";

const ROOT = "[A-G][b#]?";

// Corpo do acorde, sem âncoras. Aceita: Am, C7M, F#m7(b5), Dm7sus4, B4/7, E/G, D#°, C+.
export const CHORD_BODY = String.raw`${ROOT}(?:maj|min|m|dim|aug|sus[24]?|add)?\d*M?(?:sus\d*)?(?:\([b#]?\d+\))?(?:[b#]\d+)?(?:\/(?:${ROOT}|\d))?[+${DIM_CHARS}]?`;

// Uma palavra inteira, com parênteses opcionais em volta: "(G", "A)", "(D4)".
const CHORD_WORD_RE = new RegExp(String.raw`^\(?${CHORD_BODY}\)?$`);

export function isChordWord(word) {
  return CHORD_WORD_RE.test(word);
}

// Troca as variantes de "°" por "°" (para comparar sufixos de acorde).
export function normalizeDim(text) {
  return String(text).replace(new RegExp(`[${DIM_CHARS.slice(1)}]`, "g"), DIM_CHARS[0]);
}

// Acordes colados sem espaço após um baixo (ex: "E/GF#m7" = "E/G" + "F#m7").
// Só separa logo depois de "/baixo", pra não confundir letras com acordes.
export function splitGluedChords(word) {
  return word.split(/(?<=\/[A-G][b#]?)(?=[A-G])/);
}

// Palavra que é um acorde, ou vários acordes colados.
export function isChordToken(word) {
  return splitGluedChords(word).every(isChordWord);
}
