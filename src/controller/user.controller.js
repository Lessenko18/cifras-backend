import userService from "../service/user.service.js";

async function createUserController(req, res) {
  try {
    const user = await userService.createUserService(req.body);
    return res.status(201).send(user);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function updateUserController(req, res) {
  const id = req.params.id;
  try {
    const user = await userService.updateUserService(id, req.body);
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function deleteUserController(req, res) {
  const id = req.params.id;
  try {
    await userService.deleteUserService(id);
    return res.status(200).send({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getAllUserController(req, res) {
  try {
    const users = await userService.getAllUserService();
    return res.status(200).send(users);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getUserByIdController(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

export default {
  createUserController,
  getAllUserController,
  getUserByIdController,
  updateUserController,
  deleteUserController,
};
