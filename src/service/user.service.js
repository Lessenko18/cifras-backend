import bcrypt from "bcrypt";
import userRepositories from "../repositories/user.repositories.js";

async function createUserService(data) {
  if (!data.nome || !data.password || !data.level)
    throw new Error("Preencha todas as informações");

  if (data.password) data.password = await bcrypt.hash(data.password, 10);
  const user = await userRepositories.createUserRepository(data);
  return user;
}

async function updateUserService(id, data) {
  if (
    !data.nome &&
    !data.password &&
    !data.level &&
    !data.avatar &&
    !data.email
  )
    throw new Error("Atualize pelo menos 1 campo");

  const user = await userRepositories.getUserByIdRepository(id);
  if (!user) throw new Error("Usuário não encontrado");
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

export default {
  createUserService,
  getAllUserService,
  getUserById,
  updateUserService,
  deleteUserService,
};
