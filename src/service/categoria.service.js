import categoriaRepositories from "../repositories/categoria.repositories.js";

async function createCategoriaService(data) {
  const categoria = await categoriaRepositories.createCategoriaRepository(data);
  return categoria;
}

async function updateCategoriaService(id, data) {
  const categoria = await categoriaRepositories.getCategoriaByIdRepository(id);
  if (!categoria) throw new Error("Categoria não encontrada");
  const categoriaAt = await categoriaRepositories.updateCategoriaRepository(
    id,
    data,
  );
  return categoriaAt;
}

async function deleteCategoriaService(id) {
  const categoria = await categoriaRepositories.getCategoriaByIdRepository(id);
  if (!categoria) throw new Error("Categoria não encontrada");
  await categoriaRepositories.deleteCategoriaRepository(id);
  return { message: "Categoria deletado com sucesso" };
}

async function getAllCategoriaService() {
  const categorias = await categoriaRepositories.getAllCategoriaRepository();
  if (categorias.length == 0)
    return { message: "Nenhuma Categoria cadastrada" };

  return categorias;
}

async function searchCategoriaService(nome) {
  if (!nome || nome.trim().length < 1) {
    return [];
  }

  const categorias = await categoriaRepositories.searchCategoriaRepository(
    nome.trim(),
  );

  return categorias; 
}

async function getCategoriaById(id) {
  const categoria = await categoriaRepositories.getCategoriaByIdRepository(id);
  if (!categoria) throw new Error("Categoria não encontrada");

  return categoria;
}

export default {
  createCategoriaService,
  getAllCategoriaService,
  getCategoriaById,
  updateCategoriaService,
  deleteCategoriaService,
  searchCategoriaService,
};
