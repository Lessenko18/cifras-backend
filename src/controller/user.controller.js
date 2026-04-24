import userService from "../service/user.service.js";
import {
  getSignedAvatarUrl,
  resolveAvatarKey,
  uploadToS3,
} from "../middlewares/upload.middleware.js";

async function createUserController(req, res) {
  try {
    const user = await userService.createUserService(req.body);
    return res.status(201).send(user);
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
  const isAdm = req.userLevel === "ADM";
  const isSelf = req.userId === req.params.id;

  if (!isAdm && !isSelf) {
    return res.status(403).json({
      message: "Usuário comum só pode consultar o próprio perfil",
    });
  }

  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function updateUserController(req, res) {
  const id = req.params.id;

  const isAdm = req.userLevel === "ADM";
  const isSelfUpdate = req.userId === id;

  if (!isAdm && !isSelfUpdate) {
    return res.status(403).json({
      message: "Usuário comum só pode editar o próprio perfil",
    });
  }

  const payload = { ...req.body };

  if (!isAdm && Object.prototype.hasOwnProperty.call(payload, "level")) {
    delete payload.level;
  }

  try {
    const user = await userService.updateUserService(id, payload);
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

async function updateProfile(req, res) {
  const userId = req.userId;

  try {
    const updatedData = req.body;
    delete updatedData.level;

    let avatarKey;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file);
      avatarKey = uploadResult.Key;
    }

    const updatedUser = await userService.updateUserProfile(
      userId,
      updatedData,
      avatarKey,
    );

    const signedAvatarUrl = updatedUser.avatar
      ? await getSignedAvatarUrl(updatedUser.avatar)
      : null;

    return res.status(200).json({
      message: "Perfil atualizado com sucesso!",
      user: {
        ...updatedUser.toObject(),
        avatarUrl: signedAvatarUrl,
      },
    });
  } catch (error) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "Arquivo muito grande. Limite máximo de 200MB.",
      });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Erro ao atualizar perfil",
      error: error.message,
    });
  }
}

async function uploadAvatar(req, res) {
  const userId = req.userId;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo não fornecido" });
    }

    const uploadResult = await uploadToS3(req.file);
    const avatarKey = uploadResult.Key;

    // Atualizar usuário com a nova imagem
    await userService.updateUserProfile(userId, {}, avatarKey);

    return res.status(200).json({
      imageUrl: uploadResult.Location,
      expiresIn: uploadResult.ExpiresIn,
      message: "Avatar enviado com sucesso!",
    });
  } catch (error) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Arquivo muito grande",
        message: "Limite máximo permitido é de 200MB",
      });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        error: "Erro de validação do arquivo",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Erro ao fazer upload do avatar",
      message: error.message,
    });
  }
}

async function refreshAvatarUrl(req, res) {
  const userId = req.userId;

  try {
    const user = await userService.getUserById(userId);
    if (!user || !user.avatar) {
      return res.status(404).json({ error: "Avatar não encontrado" });
    }

    const key = resolveAvatarKey(user.avatar);

    if (!key) {
      return res.status(400).json({ error: "URL de avatar inválida" });
    }

    const signedUrl = await getSignedAvatarUrl(key);

    if (user.avatar !== key) {
      await userService.updateUserService(userId, { avatar: key });
    }

    return res.status(200).json({
      imageUrl: signedUrl,
      expiresIn: 60 * 60,
      message: "URL do avatar atualizada!",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao renovar URL do avatar",
      message: error.message,
    });
  }
}

async function searchUsersController(req, res) {
  try {
    const query = req.query.q;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Informe um termo de busca" });
    }

    const users = await userService.searchUsersByEmail(query);
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar usuários",
      message: error.message,
    });
  }
}

async function toggleFavoritoController(req, res) {
  try {
    const favoritos = await userService.toggleFavoritoService(req.userId, req.params.cifraId);
    return res.status(200).json({ favoritos });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getFavoritosController(req, res) {
  try {
    const favoritos = await userService.getFavoritosService(req.userId);
    return res.status(200).json({ favoritos });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export default {
  createUserController,
  getAllUserController,
  getUserByIdController,
  updateUserController,
  deleteUserController,
  updateProfile,
  uploadAvatar,
  refreshAvatarUrl,
  searchUsersController,
  toggleFavoritoController,
  getFavoritosController,
};
