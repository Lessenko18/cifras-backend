import bcrypt from "bcrypt";
import userRepositories from "../repositories/user.repositories.js";

async function createUserService(data) {
  if (!data.name || !data.password || !data.email)
    throw new Error("Preencha todas as informações");

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

  // Remove campos sensíveis para evitar sobrescrever senha/nível por esta rota
  const { password, level, ...dataWithoutSensitiveFields } = updatedData;

  // Atualiza os dados do usuário (exceto a senha)
  Object.assign(user, dataWithoutSensitiveFields);
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
