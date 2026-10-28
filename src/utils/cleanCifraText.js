// CÓPIA do Frontend/src/utils/cleanCifraText.js (ver nota em cifraParser.js).
// Cifras copiadas de sites (ex.: Cifra Club) costumam trazer caracteres
// invisiveis, como o espaco de largura zero (U+200B) no comeco de cada linha.
// Eles fazem o acorde D virar (U+200B)D, que deixa de ser reconhecido.
// Esta funcao tira esses caracteres e normaliza espacos e quebras de linha.
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

export function cleanCifraText(text) {
  if (!text) return text;
  return String(text)
    .replace(INVISIBLE_CHARS, "")
    .replace(/[\u00A0\u2007\u202F]/g, " ") // espacos duros viram espaco comum
    .replace(/\r\n?/g, "\n");
}
