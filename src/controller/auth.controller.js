import * as authService from "../service/auth.service.js";
import userRepository from "../repositories/user.repositories.js";

export async function login(req, res) {
  const { email, password, remember } = req.body;
  try {
    const result = await authService.login(email, password, remember);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

export async function register(req, res) {
  const { name, email, password, level } = req.body;
  try {
    const newUser = await authService.register({
      name,
      email,
      password,
      level,
    });
    res
      .status(201)
      .json({ message: "Usuário criado com sucesso", user: newUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}
export async function me(req, res) {
  try {
    const user = await userRepository.getUserByIdRepository(req.userId);
    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao buscar usuário logado" });
  }
}
export function logout(req, res) {
  return res.status(200).json({
    message: "Logout realizado com sucesso",
  });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    const result = await authService.forgotPassword(email);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  try {
    const result = await authService.resetPassword(token, newPassword);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}
