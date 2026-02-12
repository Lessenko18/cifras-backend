import userService from "../service/user.service.js";
import { uploadToS3 } from "../middlewares/upload.middleware.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    const signedUrl = uploadResult.SignedUrl; // URL pré-assinada

    // Atualizar usuário com a nova imagem
    const updatedUser = await userService.updateUserProfile(
      userId,
      {},
      signedUrl, // Armazenar a URL pré-assinada
    );

    return res.status(200).json({
      imageUrl: signedUrl,
      expiresIn: uploadResult.ExpiresIn,
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

    // Extrair a chave do S3 da URL PRÉ-ASSINADA atual
    const avatarUrl = user.avatar;
    const keyMatch = avatarUrl.match(/\/avatars\/[^?]+/);

    if (!keyMatch) {
      return res.status(400).json({ error: "URL de avatar inválida" });
    }

    const key = keyMatch[0].substring(1); // Remove a barra inicial

    // Gerar nova URL pré-assinada usando AWS SDK v3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    });

    const newSignedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600, // 1 hora
    });

    await userService.updateUserService(userId, { avatar: newSignedUrl });

    return res.status(200).json({
      imageUrl: newSignedUrl,
      expiresIn: 3600,
      message: "URL do avatar renovada!",
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
