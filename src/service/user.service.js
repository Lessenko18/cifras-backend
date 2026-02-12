import bcrypt from "bcrypt";
import userRepositories from "../repositories/user.repositories.js";

async function createUserService(data) {
  if (!data.nome || !data.password || !data.level || !data.email)
    throw new Error("Preencha todas as informações");

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  const user = await userRepositories.createUserRepository(data);
  return user;
}

async function updateUserService(id, data) {
  if (
    !data.name &&
    !data.password &&
    !data.level &&
    !data.avatar &&
    !data.email
  )
    throw new Error("Atualize pelo menos 1 campo");

  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw new Error("Usuário não encontrado");

  // Se a senha foi enviada, fazer o hash antes de atualizar
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  const userAt = await userRepositories.updateUserRepository(id, data);
  return userAt;
}

async function deleteUserService(id) {
  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw new Error("Usuário não encontrado");
  await userRepositories.deleteUserRepository(id);
  return { message: "Usuário deletado com sucesso" };
}

async function getAllUserService() {
  const users = await userRepositories.getAllUserRepository();
  if (users.length == 0) return { message: "Nenhum usuário encontrado" };

  return users;
}

async function getUserById(id) {
  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw new Error("Usuário não encontrado");

  return user;
}

// Método para atualizar o perfil do usuário
async function updateUserProfile(userId, updatedData, profileImage) {
  const user = await userRepositories.getUserByIdRepository(userId);
  if (!user) throw new Error("Usuário não encontrado");

  // Remove o campo password do updatedData para evitar sobrescrever a senha
  const { password, ...dataWithoutPassword } = updatedData;

  // Atualiza os dados do usuário (exceto a senha)
  Object.assign(user, dataWithoutPassword);
  if (profileImage) user.avatar = profileImage;

  await user.save();
  return user;
}

async function searchUsersByEmail(query) {
  const users = await userRepositories.searchUsersByEmail(query);
  return users;
}

export default {
  createUserService,
  getAllUserService,
  getUserById,
  updateUserService,
  deleteUserService,
  updateUserProfile,
  searchUsersByEmail,
};
