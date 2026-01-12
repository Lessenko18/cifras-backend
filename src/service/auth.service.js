import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repositories.js";

export async function register({ nome, email, password }) {
  const userExists = await userRepository.findUserByEmail(email);

  if (userExists) {
    throw new Error("Usuário já existe");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userRepository.createUserRepository({
    nome,
    email,
    password: hashedPassword,
    level: "USER",
  });

  return {
    id: user._id,
    nome: user.nome,
    email: user.email,
    level: user.level,
  };
}

export async function login(email, password) {
  const user = await userRepository.findUserByEmail(email);

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const senhaValida = await bcrypt.compare(password, user.password);

  if (!senhaValida) {
    throw new Error("Senha inválida");
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, level: user.level },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return { token };
}
