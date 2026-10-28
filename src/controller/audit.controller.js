import { listAuditLogs } from "../service/audit.service.js";

async function getAuditLogsController(req, res) {
  try {
    const { page, limit, action, entity, q } = req.query;
    const result = await listAuditLogs({
      page,
      limit,
      action: typeof action === "string" ? action : undefined,
      entity: typeof entity === "string" ? entity : undefined,
      q: typeof q === "string" ? q : undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar o histórico" });
  }
}

export default { getAuditLogsController };
