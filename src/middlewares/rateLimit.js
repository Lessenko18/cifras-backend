import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

// Na Vercel cada invocação pode cair numa instância diferente, então o store em
// memória do express-rate-limit zera o contador o tempo todo e o limite vira
// enfeite. Este store guarda os contadores no MongoDB (que o app já usa), com
// índice TTL para o próprio banco apagar as janelas vencidas.
const COLLECTION = "ratelimits";

let indexPromise = null;
function ensureIndex(collection) {
  indexPromise ??= collection
    .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 })
    .catch((error) => {
      indexPromise = null;
      throw error;
    });
  return indexPromise;
}

function defaultCollection() {
  // Sem conexão pronta, falha na hora em vez de ficar em buffer por 10s;
  // com passOnStoreError a requisição segue (fail-open) e o erro é logado.
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB indisponível para o rate limit");
  }
  return mongoose.connection.collection(COLLECTION);
}

export class MongoRateLimitStore {
  // `prefix` isola os contadores de cada limiter (o mesmo IP tem um contador por rota).
  // `getCollection` existe para teste; em produção usa a conexão do mongoose.
  constructor(prefix, { getCollection = defaultCollection } = {}) {
    this.prefix = prefix;
    this.windowMs = 60_000;
    this.getCollection = getCollection;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  #collection() {
    return this.getCollection();
  }

  #id(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    const collection = this.#collection();
    await ensureIndex(collection);

    const now = new Date();
    const fresh = new Date(now.getTime() + this.windowMs);
    // Atômico: se a janela ainda vale soma 1; se venceu (ou não existe) recomeça em 1.
    const doc = await collection.findOneAndUpdate(
      { _id: this.#id(key) },
      [
        {
          $set: {
            count: { $cond: [{ $gt: ["$resetAt", now] }, { $add: ["$count", 1] }, 1] },
            resetAt: { $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", fresh] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" },
    );

    return { totalHits: doc.count, resetTime: doc.resetAt };
  }

  async decrement(key) {
    await this.#collection().updateOne(
      { _id: this.#id(key), count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
  }

  async resetKey(key) {
    await this.#collection().deleteOne({ _id: this.#id(key) });
  }
}

// Fábrica usada por todas as rotas: mesmo comportamento do rateLimit() padrão,
// só que com contador compartilhado entre instâncias.
export function createLimiter(name, options, storeOptions) {
  return rateLimit({
    passOnStoreError: true,
    ...options,
    store: new MongoRateLimitStore(name, storeOptions),
  });
}
