// Texto de busca: minúsculas, sem acentos e com espaços simples. É o que vai nos campos
// `nomeBusca`/`artistaBusca` da cifra e também o que o termo digitado vira antes da consulta.
export function normalizeBusca(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
