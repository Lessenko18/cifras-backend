import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { isMailConfigured, sendMail, sendMailBatch, withTimeout } from "../src/service/mail.service.js";

beforeEach(() => {
  for (const k of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) delete process.env[k];
});

test("isMailConfigured exige host, usuário e senha", () => {
  assert.equal(isMailConfigured(), false);
  process.env.SMTP_HOST = "h";
  process.env.SMTP_USER = "u";
  assert.equal(isMailConfigured(), false);
  process.env.SMTP_PASS = "p";
  assert.equal(isMailConfigured(), true);
});

test("sendMailBatch sem mensagens não faz nada e conta como enviado", async () => {
  assert.deepEqual(await sendMailBatch([]), { sent: true, failures: [] });
});

test("sendMailBatch sem SMTP configurado informa o que falta, sem lançar", async () => {
  const r = await sendMailBatch([{ to: "a@b.com", subject: "x", text: "y" }]);
  assert.equal(r.sent, false);
  assert.deepEqual(r.missing, ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]);
});

test("sendMail lança com statusCode 500 quando o SMTP não está configurado", async () => {
  await assert.rejects(
    () => sendMail({ to: "a@b.com", subject: "x", text: "y" }),
    (err) => err.statusCode === 500,
  );
});

test("withTimeout rejeita com 504 quando estoura o tempo", async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 20, "demorou"),
    (err) => err.statusCode === 504 && err.message === "demorou",
  );
  assert.equal(await withTimeout(Promise.resolve(7), 100, "x"), 7);
});
