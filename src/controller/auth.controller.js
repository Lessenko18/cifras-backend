import * as authService from "../service/auth.service.js";

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

export async function register(req, res) {
  const { nome, email, password, level } = req.body;
  try {
    const newUser = await authService.register({
      nome,
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
