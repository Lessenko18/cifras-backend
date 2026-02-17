import userService from "../service/user.service.js";
import { uploadToS3 } from "../middlewares/upload.middleware.js";

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
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).send(user);
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

async function updateProfile(req, res) {
  const userId = req.userId;

  try {
    const updatedData = req.body;
    let profileImage;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file);
      profileImage = uploadResult.Location; // URL pública da imagem
    }

    const updatedUser = await userService.updateUserProfile(
      userId,
      updatedData,
      profileImage,
    );

    return res.status(200).json({
      message: "Perfil atualizado com sucesso!",
      user: updatedUser,
    });
  } catch (error) {
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
    const publicUrl = uploadResult.Location; // URL publica do S3

    // Atualizar usuário com a nova imagem
    await userService.updateUserProfile(userId, {}, publicUrl);

    return res.status(200).json({
      imageUrl: publicUrl,
      expiresIn: null,
      message: "Avatar enviado com sucesso!",
    });
  } catch (error) {
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

    const avatarUrl = user.avatar;
    let key;

    try {
      const parsedUrl = new URL(avatarUrl);
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith("/avatars/")) {
        key = parsedUrl.pathname.substring(1);
      }
    } catch (parseError) {
      // Ignorar erros de parse e tentar via regex
    }

    if (!key) {
      const keyMatch = avatarUrl.match(/\/avatars\/[^?]+/);
      if (keyMatch) key = keyMatch[0].substring(1);
    }

    if (!key) {
      return res.status(400).json({ error: "URL de avatar inválida" });
    }

    const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    if (user.avatar !== publicUrl) {
      await userService.updateUserService(userId, { avatar: publicUrl });
    }

    return res.status(200).json({
      imageUrl: publicUrl,
      expiresIn: null,
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
};
