import User from "../models/User.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function createUserRepository(data) {
  return User.create(data);
}

async function updateUserRepository(id, data) {
  return User.findOneAndUpdate({ _id: id }, data, { new: true }).select("-password");
}

async function deleteUserRepository(id) {
  return User.findByIdAndDelete(id);
}

async function getAllUserRepository() {
  return User.find().sort({ _id: -1 }).select("-password");
}

async function getUserByIdRepository(id) {
  return User.findById(id).select("-password");
}

const findUserByEmail = async (email) => {
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  return User.findOne({ email: normalizedEmail });
};

const findUserByResetToken = async (hashedToken) => {
  return User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });
};

const findUsersByEmailList = async (emails) => {
  return User.find({ email: { $in: emails } }).select("-password");
};

const searchUsersByEmail = async (query) => {
  const safe = escapeRegex(String(query || "").trim());
  const regex = new RegExp(safe, "i");
  return User.find({ email: { $regex: regex } })
    .select("email name")
    .limit(10)
    .sort({ email: 1 });
};

const toggleFavoritoRepository = async (userId, cifraId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("Usuário não encontrado");

  const index = user.favoritos.findIndex((id) => id.toString() === cifraId);
  if (index === -1) {
    user.favoritos.push(cifraId);
  } else {
    user.favoritos.splice(index, 1);
  }

  await user.save();
  return user.favoritos.map((id) => id.toString());
};

const getFavoritosRepository = async (userId) => {
  const user = await User.findById(userId).select("favoritos");
  if (!user) throw new Error("Usuário não encontrado");
  return user.favoritos.map((id) => id.toString());
};

export default {
  createUserRepository,
  getAllUserRepository,
  getUserByIdRepository,
  updateUserRepository,
  deleteUserRepository,
  findUserByEmail,
  findUserByResetToken,
  findUsersByEmailList,
  searchUsersByEmail,
  toggleFavoritoRepository,
  getFavoritosRepository,
};
