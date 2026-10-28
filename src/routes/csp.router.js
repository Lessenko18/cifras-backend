import { Router } from "express";
import express from "express";
import rateLimit from "express-rate-limit";

const cspRouter = Router();

// Recebe os relatórios da CSP em modo Report-Only do front. Público (o navegador
// envia sem credenciais), então: limite de taxa, corpo pequeno e só loga campos
// conhecidos, truncados. Vai pro log da Vercel; nada é gravado no banco.
const cspLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => res.status(204).send(),
});

const cut = (v) => (typeof v === "string" ? v.slice(0, 300) : undefined);

cspRouter.post(
  "/",
  cspLimiter,
  express.json({ type: ["application/csp-report", "application/reports+json", "application/json"], limit: "10kb" }),
  (req, res) => {
    const r = req.body?.["csp-report"] ?? req.body ?? {};
    console.warn("[CSP_VIOLATION]", {
      directive: cut(r["violated-directive"] ?? r.effectiveDirective),
      blocked: cut(r["blocked-uri"] ?? r.blockedURL),
      document: cut(r["document-uri"] ?? r.documentURL),
      source: cut(r["source-file"] ?? r.sourceFile),
    });
    res.status(204).send();
  },
);

export default cspRouter;
