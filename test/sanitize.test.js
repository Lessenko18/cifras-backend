import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRequest } from "../src/middlewares/sanitize.middleware.js";

function run(req) {
  let called = false;
  sanitizeRequest(req, {}, () => {
    called = true;
  });
  assert.equal(called, true, "deve chamar next()");
  return req;
}

test("remove operadores do Mongo ($set, $where...) em qualquer nível", () => {
  const req = run({
    body: { name: "x", $set: { level: "ADM" }, nested: { $where: "1", ok: 1 } },
    params: {},
    query: {},
  });
  assert.deepEqual(req.body, { name: "x", nested: { ok: 1 } });
});

test("remove chaves com ponto (a.b)", () => {
  const req = run({ body: { "a.b": 1, c: 2 }, params: {}, query: {} });
  assert.deepEqual(req.body, { c: 2 });
});

test("limpa a query (?q[$ne]=)", () => {
  const req = run({ body: {}, params: {}, query: { q: { $ne: "" }, ok: "1" } });
  assert.deepEqual(req.query, { q: {}, ok: "1" });
});

test("percorre arrays", () => {
  const req = run({ body: { list: [{ $gt: 1, a: 1 }] }, params: {}, query: {} });
  assert.deepEqual(req.body, { list: [{ a: 1 }] });
});

test("não quebra sem body", () => {
  run({ params: {}, query: {} });
});
