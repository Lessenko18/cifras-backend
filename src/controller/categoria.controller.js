import categoriaService from "../service/categoria.service.js";

async function createCategoriaController(req, res) {
  try {
    const categoria = await categoriaService.createCategoriaService(req.body);
    return res.status(201).send(categoria);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function updateCategoriaController(req, res) {
  const id = req.params.id;
  try {
    const categoria = await categoriaService.updateCategoriaService(
      id,
      req.body
    );
    return res.status(200).send(categoria);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function deleteCategoriaController(req, res) {
  const id = req.params.id;
  try {
    await categoriaService.deleteCategoriaService(id);
    return res.status(200).send({ message: "Categoria deletada com sucesso" });
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getAllCategoriaController(req, res) {
  try {
    const categorias = await categoriaService.getAllCategoriaService();
    return res.status(200).send(categorias);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function searchCategoriaController(req, res) {
  const { nome } = req.query;
  try {
    const categorias = await categoriaService.searchCategoriaService(nome);
    return res.status(200).send(categorias);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getCategoriaByIdController(req, res) {
  try {
    const categoria = await categoriaService.getCategoriaById(req.params.id);
    return res.status(200).send(categoria);
  } catch (error) {
    return res.status(400).send(error.message);
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
