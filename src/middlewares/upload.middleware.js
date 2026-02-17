import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

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
export const upload = multer({ storage });

// Upload para S3 com URL publica - AWS SDK v3
export const uploadToS3 = async (file) => {
  try {
    if (!file) {
      throw new Error("Nenhum arquivo fornecido");
    }

    if (!process.env.AWS_S3_BUCKET_NAME) {
      throw new Error("AWS_S3_BUCKET_NAME não configurado");
    }

    const key = `avatars/${Date.now()}-${file.originalname}`;

    // Upload do arquivo
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(putCommand);

    return {
      Location: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      Key: key,
      ExpiresIn: null,
    };
  } catch (error) {
    throw new Error(`Erro ao fazer upload para S3: ${error.message}`);
  }
};
