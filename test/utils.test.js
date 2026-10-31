import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText } from "../src/utils/cleanText.js";
import { escapeHtml } from "../src/utils/escapeHtml.js";
import { conflict, sendError } from "../src/utils/httpError.js";

test("cleanText remove caracteres invisíveis e normaliza espaços e quebras", () => {
  assert.equal(cleanText("​D‌m"), "Dm");
  assert.equal(cleanText("a b"), "a b");
  assert.equal(cleanText("a\r\nb\rc"), "a\nb\nc");
  assert.equal(cleanText(null), "");
});

test("escapeHtml neutraliza HTML", () => {
  const out = escapeHtml('<script>alert("x")</script>');
  assert.ok(!out.includes("<"));
  assert.ok(out.includes("&lt;script&gt;"));
});

function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test("sendError respeita AppError (status e code) e erros com statusCode/status", () => {
  let res = sendError(fakeRes(), conflict("duplicado"));
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { message: "duplicado", code: "CONFLICT" });

  res = sendError(fakeRes(), Object.assign(new Error("a"), { statusCode: 413 }));
  assert.equal(res.statusCode, 413);

  res = sendError(fakeRes(), Object.assign(new Error("b"), { status: 404 }));
  assert.equal(res.statusCode, 404);
});

test("sendError trata erro desconhecido como 500 sem vazar a mensagem", () => {
  const original = console.error;
  console.error = () => {};
  try {
    const res = sendError(fakeRes(), new Error("senha do banco: 123"));
    assert.equal(res.statusCode, 500);
    assert.ok(!res.body.message.includes("senha"));
    assert.equal(res.body.code, "INTERNAL_ERROR");
  } finally {
    console.error = original;
  }
});

test("sendError mapeia erros do Mongoose (validação/cast e chave duplicada)", () => {
  assert.equal(sendError(fakeRes(), Object.assign(new Error("x"), { name: "ValidationError" })).statusCode, 400);
  assert.equal(sendError(fakeRes(), Object.assign(new Error("x"), { name: "CastError" })).statusCode, 400);
  assert.equal(sendError(fakeRes(), Object.assign(new Error("x"), { code: 11000 })).statusCode, 409);
});
