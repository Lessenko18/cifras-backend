import categoriaRepositories from "../repositories/categoria.repositories.js";

async function createCategoriaService(data) {
  const payload = { ...data };
  payload.parent = payload.parent || null;
  const categoria = await categoriaRepositories.createCategoriaRepository(payload);
  return categoria;
}

async function updateCategoriaService(id, data) {
  const categoria = await categoriaRepositories.getCategoriaByIdRepository(id);
  if (!categoria) throw new Error("Categoria não encontrada");

  const payload = { ...data };
  payload.parent = payload.parent || null;

  if (payload.parent) {
    const childrenCount = await categoriaRepositories.getChildrenCountRepository(id);
    if (childrenCount > 0) {
      throw new Error("Remova as subcategorias antes de transformar esta categoria em subcategoria.");
    }
  }

  const categoriaAt = await categoriaRepositories.updateCategoriaRepository(id, payload);
  return categoriaAt;
}

async function deleteCategoriaService(id) {
  const categoria = await categoriaRepositories.getCategoriaByIdRepository(id);
  if (!categoria) throw new Error("Categoria não encontrada");

  const childrenCount = await categoriaRepositories.getChildrenCountRepository(id);
  if (childrenCount > 0) {
    throw new Error("Remova as subcategorias antes de excluir esta categoria.");
  }

  await categoriaRepositories.deleteCategoriaRepository(id);
  return { message: "Categoria deletada com sucesso" };
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
