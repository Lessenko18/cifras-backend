import bcrypt from "bcryptjs";
import { badRequest, notFound } from "../utils/httpError.js";
import userRepositories from "../repositories/user.repositories.js";
import favoritoRepositories from "../repositories/favorito.repositories.js";
import cifraRepositories from "../repositories/cifra.repositories.js";

const MIN_PASSWORD_LENGTH = 6;

// Só estes campos podem vir do cliente. `level` só entra quando o chamador é
// ADM (quem chama decide via allowLevel). Nunca repassa o body inteiro ao banco.
function pickUserFields(data, { allowLevel = false } = {}) {
  const picked = {};
  for (const field of ["name", "email", "password"]) {
    if (typeof data?.[field] === "string") picked[field] = data[field];
  }
  if (allowLevel && ["USER", "ADM"].includes(data?.level)) {
    picked.level = data.level;
  }
  return picked;
}

const MAX_PASSWORD_BYTES = 72; // bcrypt ignora o que passar disso

function assertValidPassword(password) {
  const value = String(password);
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (Buffer.byteLength(value) > MAX_PASSWORD_BYTES) {
    throw badRequest("A senha é muito longa (máximo de 72 caracteres)");
  }
}

async function createUserService(rawData) {
  // Chamado apenas por rota restrita a ADM, que pode definir o nível
  const data = pickUserFields(rawData, { allowLevel: true });
  if (!data.name || !data.password || !data.email)
    throw badRequest("Preencha todas as informações");
  assertValidPassword(data.password);

  const normalizedData = {
    ...data,
    level: data.level || "USER",
  };

  if (normalizedData.password) {
    normalizedData.password = await bcrypt.hash(normalizedData.password, 10);
  }

  const user = await userRepositories.createUserRepository(normalizedData);
  return user;
}

async function updateUserService(id, rawData, { allowLevel = false } = {}) {
  // Allowlist: avatar só muda via /user/upload-avatar (grava a key correta do
  // R2) e `level` só quando quem edita é ADM. Qualquer outra chave é descartada.
  const data = pickUserFields(rawData, { allowLevel });

  if (!data.name && !data.password && !data.level && !data.email)
    throw badRequest("Atualize pelo menos 1 campo");

  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw notFound("Usuário não encontrado");

  // Se a senha foi enviada, fazer o hash antes de atualizar
  if (data.password) {
    assertValidPassword(data.password);
    data.password = await bcrypt.hash(data.password, 10);
    data.passwordChangedAt = new Date();
  }

  const userAt = await userRepositories.updateUserRepository(id, data);
  return userAt;
}

async function deleteUserService(id) {
  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw notFound("Usuário não encontrado");
  await userRepositories.deleteUserRepository(id);
  await favoritoRepositories.deleteFavoritosByUserRepository(id);
  return { message: "Usuário deletado com sucesso" };
}

async function getAllUserService() {
  const users = await userRepositories.getAllUserRepository();
  if (users.length == 0) return { message: "Nenhum usuário encontrado" };

  return users;
}

async function getUserById(id) {
  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw notFound("Usuário não encontrado");

  return user;
}

// Método para atualizar o perfil do usuário
async function updateUserProfile(userId, updatedData, profileImage) {
  const user = await userRepositories.getUserByIdRepository(userId);
  if (!user) throw notFound("Usuário não encontrado");

  // Allowlist: nome e e-mail apenas (nada de senha, nível, avatar, favoritos...)
  const { name, email } = pickUserFields(updatedData);
  if (name) user.name = name;
  if (email) user.email = email;
  if (profileImage) user.avatar = profileImage;

  await user.save();
  return user;
}

async function searchUsersByEmail(query) {
  const users = await userRepositories.searchUsersByEmail(query);
  return users;
}

async function toggleFavoritoService(userId, cifraId) {
  if (!(await cifraRepositories.cifraExistsByIdRepository(cifraId))) throw notFound("Cifra não encontrada");
  return favoritoRepositories.toggleFavoritoRepository(userId, cifraId);
}

async function getFavoritosService(userId) {
  return favoritoRepositories.listFavoritosRepository(userId);
}

export default {
  createUserService,
  getAllUserService,
  getUserById,
  updateUserService,
  deleteUserService,
  updateUserProfile,
  searchUsersByEmail,
  toggleFavoritoService,
  getFavoritosService,
};
