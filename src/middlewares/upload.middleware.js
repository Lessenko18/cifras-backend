import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import rateLimit from "express-rate-limit";
import { fileTypeFromBuffer } from "file-type";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Configuração AWS S3 Client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Multer em memória
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      const error = new Error(
        "Apenas imagens (jpeg, png, webp, gif) são permitidas",
      );
      error.statusCode = 415;
      return cb(error);
    }

    return cb(null, true);
  },
});

export const avatarUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas de upload. Tente novamente em alguns minutos.",
  },
});

const extractKeyFromAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return null;

  if (avatarUrl.startsWith("avatars/")) {
    return avatarUrl;
  }

  try {
    const parsedUrl = new URL(avatarUrl);
    const pathname = parsedUrl.pathname?.startsWith("/")
      ? parsedUrl.pathname.substring(1)
      : parsedUrl.pathname;

    return pathname || null;
  } catch (error) {
    return null;
  }
};

export const resolveAvatarKey = (avatarValue) => {
  return extractKeyFromAvatarUrl(avatarValue);
};

const assertRealImageContent = async (file) => {
  const detectedType = await fileTypeFromBuffer(file.buffer);

  if (!detectedType || !ALLOWED_IMAGE_MIME_TYPES.has(detectedType.mime)) {
    const error = new Error(
      "Conteúdo do arquivo inválido. Envie uma imagem válida.",
    );
    error.statusCode = 415;
    throw error;
  }

  return detectedType;
};

export const getSignedAvatarUrl = async (key) => {
  const getCommand = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, getCommand, {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
};

// Upload para S3 com URL publica - AWS SDK v3
export const uploadToS3 = async (file) => {
  try {
    if (!file) {
      throw new Error("Nenhum arquivo fornecido");
    }

    if (!process.env.AWS_S3_BUCKET_NAME) {
      throw new Error("AWS_S3_BUCKET_NAME não configurado");
    }

    const detectedType = await assertRealImageContent(file);
    const key = `avatars/${uuidv4()}.${detectedType.ext}`;

    // Upload do arquivo
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: detectedType.mime,
    });

    await s3Client.send(putCommand);

    const signedUrl = await getSignedAvatarUrl(key);

    return {
      Location: signedUrl,
      Key: key,
      ExpiresIn: SIGNED_URL_TTL_SECONDS,
    };
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }

    throw new Error(`Erro ao fazer upload para S3: ${error.message}`);
  }
};
