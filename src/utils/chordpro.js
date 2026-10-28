// Conversão entre o formato atual da cifra (acordes numa linha, letra na de baixo)
// e ChordPro (acorde entre colchetes, colado na palavra: "[C]Deve haver um [G]lugar").
// Implementação própria, sem biblioteca (a mais popular, chordsheetjs, é GPL).
//
// SEGURANÇA DA MIGRAÇÃO: toda conversão passa por convertAndVerify(), que só aceita
// o resultado se, convertendo o ChordPro de volta, a tela enxergar EXATAMENTE os
// mesmos trechos (parseCifraText) que enxerga no texto original.
//
// Este arquivo é igual ao do Frontend (src/utils/chordpro.js): mantenha os dois.

import { buildTokens, parseCifraText } from "./cifraParser.js";

// "[Refrão]" sozinho na linha é rótulo de seção, não acorde. No ChordPro vira {comment: Refrão}.
const SECTION_RE = /^\s*\[([^\]]{1,40})\]\s*$/;
const COMMENT_RE = /^\{comment:\s*(.*?)\s*\}$/;
// Linha que precisa ficar exatamente como está (ex.: "[Intro] D  G  A", que no ChordPro
// seria lida como acorde). "x_" é o prefixo reservado do formato para diretivas próprias.
const RAW_RE = /^\{x_linha: (.*)\}$/;
// Texto "fora dos colchetes" que não conta como letra (linha só de acordes)
const SYMBOLS_ONLY_RE = /^[\s|/\-:]*$/;
const RESERVED_RE = /[[\]{}]/;

class NotConvertible extends Error {}

function chordsOf(token) {
  return token.chord ? token.chord.split(" ") : [];
}

// Quebra cada acorde de uma linha só de acordes: "E/GF#m7" -> "[E/G][F#m7]".
// Símbolos ("|", "-") ficam como estão, fora dos colchetes.
function chordOnlyToChordPro(line) {
  return line.replace(/\S+/g, (word) => {
    if (/^[|/\-:]+$/.test(word)) return word;
    return word
      .split(/(?<=\/[A-G][b#]?)(?=[A-G])/)
      .map((c) => `[${c}]`)
      .join("");
  });
}

/** Texto no formato atual -> ChordPro. Lança NotConvertible se algo for ambíguo. */
export function legacyToChordPro(text) {
  const out = parseCifraText(text).map((seg) => {
    switch (seg.type) {
      case "blank":
        return "";

      case "plain": {
        const section = seg.line.match(SECTION_RE);
        if (section) return `{comment: ${section[1].trim()}}`;
        // colchetes/chaves ou "#" no começo seriam lidos como acorde/diretiva/comentário:
        // guarda a linha crua, idêntica à original
        if (RESERVED_RE.test(seg.line) || /^\s*#/.test(seg.line)) return `{x_linha: ${seg.line}}`;
        return seg.line;
      }

      case "chord-only":
        return chordOnlyToChordPro(seg.line);

      case "chord-lyric":
        return seg.tokens
          .map((t) => {
            if (RESERVED_RE.test(t.lyric)) throw new NotConvertible("letra com [ ] { }");
            return chordsOf(t).map((c) => `[${c}]`).join("") + t.lyric;
          })
          .join("");

      default:
        throw new NotConvertible(`trecho desconhecido: ${seg.type}`);
    }
  });
  return out.join("\n");
}

// "[C]Deve [G]haver" -> { lyric: "Deve haver", chords: [{ text: "C", pos: 0 }, { text: "G", pos: 5 }] }
function splitLine(line) {
  let lyric = "";
  const chords = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(line))) {
    lyric += line.slice(last, m.index);
    chords.push({ text: m[1], pos: lyric.length });
    last = m.index + m[0].length;
  }
  lyric += line.slice(last);
  return { lyric, chords };
}

/**
 * ChordPro -> trechos que a tela desenha (mesmo formato de parseCifraText).
 * É o caminho CERTO para exibir uma cifra em ChordPro: o acorde vai direto para a
 * palavra, sem passar por uma linha de acordes (que não tem espaço quando vários
 * acordes ficam sobre uma palavra curta).
 */
export function chordProToSegments(chordpro) {
  const segments = [];

  for (const line of String(chordpro ?? "").split("\n")) {
    if (!line.trim()) {
      segments.push({ type: "blank" });
      continue;
    }

    const raw = line.match(RAW_RE);
    if (raw) {
      segments.push({ type: "plain", line: raw[1] });
      continue;
    }

    const comment = line.trim().match(COMMENT_RE);
    if (comment) {
      segments.push({ type: "plain", line: `[${comment[1]}]` });
      continue;
    }

    if (!line.includes("[")) {
      segments.push({ type: "plain", line });
      continue;
    }

    const { lyric, chords } = splitLine(line);
    if (SYMBOLS_ONLY_RE.test(lyric)) {
      segments.push({ type: "chord-only", line: line.replace(/\[([^\]]*)\]/g, "$1") });
    } else {
      segments.push({ type: "chord-lyric", tokens: buildTokens(chords, lyric) });
    }
  }

  return segments;
}

/**
 * ChordPro -> formato atual (duas linhas). Aproximado: quando vários acordes ficam
 * sobre uma palavra curta, um pode cair na palavra seguinte. Para exibir, use
 * chordProToSegments. É o que a tela usa para exibir uma
 * cifra guardada em ChordPro, sem mudar o resto do app.
 */
export function chordProToLegacy(chordpro) {
  const lines = String(chordpro ?? "").split("\n");
  const out = [];

  for (const line of lines) {
    if (!line.trim()) {
      out.push("");
      continue;
    }

    const raw = line.match(RAW_RE);
    if (raw) {
      out.push(raw[1]);
      continue;
    }

    const comment = line.trim().match(COMMENT_RE);
    if (comment) {
      out.push(`[${comment[1]}]`);
      continue;
    }

    if (!line.includes("[")) {
      out.push(line);
      continue;
    }

    const { lyric, chords } = splitLine(line);

    // só acordes (e símbolos como "|"): continua uma linha só, sem a linha de letra
    if (SYMBOLS_ONLY_RE.test(lyric)) {
      out.push(lyric.length ? line.replace(/\[([^\]]*)\]/g, "$1") : chords.map((c) => c.text).join(" "));
      continue;
    }

    // acorde na coluna onde cai na letra; se encostar no anterior, vai um espaço depois
    let chordLine = "";
    for (const { text, pos } of chords) {
      const col = Math.max(pos, chordLine.length ? chordLine.length + 1 : 0);
      chordLine += " ".repeat(col - chordLine.length) + text;
    }
    out.push(chordLine, lyric);
  }

  return out.join("\n");
}

// Rótulos de seção equivalem entre si mesmo com espaços diferentes ao redor
function normalizeSegments(segments) {
  return segments.map((s) => {
    if (s.type !== "plain") return s;
    const m = s.line.match(SECTION_RE);
    return m ? { ...s, line: `[${m[1].trim()}]` } : s;
  });
}

function sameSegments(a, b) {
  return JSON.stringify(normalizeSegments(a)) === JSON.stringify(normalizeSegments(b));
}

/**
 * Converte e PROVA a conversão. Nunca lança.
 * -> { ok: true, chordpro } | { ok: false, reason }
 */
export function convertAndVerify(text) {
  try {
    if (typeof text !== "string" || !text.trim()) return { ok: false, reason: "sem texto" };

    const chordpro = legacyToChordPro(text);
    const original = parseCifraText(text);
    const roundTrip = chordProToSegments(chordpro);

    if (!sameSegments(original, roundTrip)) {
      return { ok: false, reason: "a tela enxergaria diferente depois de converter" };
    }
    if (!chordpro.includes("[") && original.some((s) => s.type === "chord-lyric" || s.type === "chord-only")) {
      return { ok: false, reason: "acordes perdidos" };
    }
    return { ok: true, chordpro };
  } catch (error) {
    return { ok: false, reason: error instanceof NotConvertible ? error.message : `erro: ${error.message}` };
  }
}
