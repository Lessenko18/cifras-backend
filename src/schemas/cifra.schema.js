import { z } from "zod";
import { csvOfObjectIds, objectIdSchema, queryInt } from "./common.schema.js";

const text = (max) => z.string().max(max, "Texto longo demais");

// Query de GET /cifra. `limit` acima do teto é reduzido (compatível com o
// comportamento antigo); page/limit inválidos (NaN, negativo, texto) dão 400.
export const listCifrasQuerySchema = z.object({
  nome: text(200).optional(),
  artista: text(200).optional(),
  categorias: csvOfObjectIds(50).optional(),
  favoritos: csvOfObjectIds(1000).optional(),
  page: queryInt({ min: 0, max: 100000, fallback: 0 }),
  limit: queryInt({ min: 1, max: 100, fallback: 15, clamp: true }),
});

export const homeInsightsQuerySchema = z.object({
  limit: queryInt({ min: 1, max: 20, fallback: 6, clamp: true }),
});

// Corpo de criar/editar cifra (após o pick/normalização dos campos).
export const cifraFieldsSchema = z
  .object({
    nome: text(200),
    artista: text(200),
    link: text(2000),
    observacao: text(100_000),
    bpm: z.number({ invalid_type_error: "BPM inválido" }).finite("BPM inválido").min(20, "BPM inválido").max(400, "BPM inválido"),
    categorias: z.array(objectIdSchema).max(30, "Categorias demais"),
  })
  .partial();
