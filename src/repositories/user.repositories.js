import User from "../models/User.js";

async function createUserRepository(data) {
  return User.create(data);
}

async function updateUserRepository(id, data) {
  return User.findOneAndUpdate({ _id: id }, data, { new: true });
}

async function deleteUserRepository(id) {
  return User.findByIdAndDelete(id);
}

async function getAllUserRepository() {
  return User.find().sort({ _id: -1 });
}

async function getUserByIdRepository(id) {
  return User.findById(id);
}

const findUserByEmail = async (email) => {
  return User.findOne({ email });
};

export default {
  createUserRepository,
  getAllUserRepository,
  getUserByIdRepository,
  updateUserRepository,
  deleteUserRepository,
  findUserByEmail, 
};
