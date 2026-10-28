import categoriaService from "../service/categoria.service.js";
import { logAudit, auditLabel } from "../service/audit.service.js";
import { sendError } from "../utils/httpError.js";

async function createCategoriaController(req, res) {
  try {
    const categoria = await categoriaService.createCategoriaService(req.body);
    logAudit(req, {
      action: "categoria_criada",
      entity: "categoria",
      entityId: categoria?._id,
      label: categoria?.nome,
    });
    return res.status(201).send(categoria);
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateCategoriaController(req, res) {
  const id = req.params.id;
  try {
    const categoria = await categoriaService.updateCategoriaService(
      id,
      req.body
    );
    logAudit(req, {
      action: "categoria_editada",
      entity: "categoria",
      entityId: id,
      label: categoria?.nome,
    });
    return res.status(200).send(categoria);
  } catch (error) {
    return sendError(res, error);
  }
}

async function deleteCategoriaController(req, res) {
  const id = req.params.id;
  try {
    const label = await auditLabel("categoria", id);
    await categoriaService.deleteCategoriaService(id);
    logAudit(req, { action: "categoria_excluida", entity: "categoria", entityId: id, label });
    return res.status(200).send({ message: "Categoria deletada com sucesso" });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getAllCategoriaController(req, res) {
  try {
    const categorias = await categoriaService.getAllCategoriaService();
    return res.status(200).send(categorias);
  } catch (error) {
    return sendError(res, error);
  }
}

async function searchCategoriaController(req, res) {
  const { nome } = req.query;
  try {
    const categorias = await categoriaService.searchCategoriaService(nome);
    return res.status(200).send(categorias);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getCategoriaByIdController(req, res) {
  try {
    const categoria = await categoriaService.getCategoriaById(req.params.id);
    return res.status(200).send(categoria);
  } catch (error) {
    return sendError(res, error);
  }
}

export default {
  createCategoriaController,
  getAllCategoriaController,
  getCategoriaByIdController,
  updateCategoriaController,
  deleteCategoriaController,
  searchCategoriaController,
};
