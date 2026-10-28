// Remove caracteres invisiveis (ex.: U+200B, que o Cifra Club coloca no comeco
// das linhas) e normaliza espacos e quebras de linha. Sem isso, o acorde D
// vira (U+200B)D e nao e reconhecido ao exibir/transpor a cifra.
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

export function cleanText(value) {
  return String(value ?? "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/\r\n?/g, "\n");
}
