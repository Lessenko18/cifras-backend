import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText } from "../src/utils/cleanText.js";
import { escapeHtml } from "../src/utils/escapeHtml.js";
import { sendError } from "../src/utils/httpError.js";

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

test("sendError usa statusCode, depois status, depois o padrão (400)", () => {
  let res = sendError(fakeRes(), Object.assign(new Error("a"), { statusCode: 409 }));
  assert.equal(res.statusCode, 409);

  res = sendError(fakeRes(), Object.assign(new Error("b"), { status: 404 }));
  assert.equal(res.statusCode, 404);

  res = sendError(fakeRes(), new Error("c"));
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { message: "c" });
});

test("sendError aceita o padrão customizado e erro sem mensagem", () => {
  const res = sendError(fakeRes(), {}, 500);
  assert.equal(res.statusCode, 500);
  assert.equal(typeof res.body.message, "string");
});
