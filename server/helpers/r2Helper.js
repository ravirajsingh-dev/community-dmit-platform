const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = require("../config/config");

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

/**
 * Upload file to Cloudflare R2
 * @param {Object} file - Multer file object (from memoryStorage)
 * @param {String} folder - Folder path in R2 (e.g., 'slider', 'gallery')
 * @returns {Promise<Object>} - { url, key, size, mimeType }
 */
const uploadToR2 = async (file, folder = "") => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file object");
    }

    // Generate unique file key
    const fileExtension = path.extname(file.originalname || "");
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = folder ? `${folder}/${fileName}` : fileName;

    // Prepare upload parameters
    const uploadParams = {
      Bucket: R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    // Upload to R2
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct public URL
    // Note: For public access, you need to configure a custom domain or public bucket in R2
    // If you have R2_PUBLIC_URL env variable set, use that; otherwise construct default URL
    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET}/${key}`;

    return {
      url,
      key,
      size: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

/**
 * Delete file from Cloudflare R2
 * @param {String} fileKey - The key/path of the file in R2
 * @returns {Promise<Boolean>} - True if successful
 */
const deleteFromR2 = async (fileKey) => {
  try {
    if (!fileKey) {
      throw new Error("File key is required");
    }

    const deleteParams = {
      Bucket: R2_BUCKET,
      Key: fileKey,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error(`Failed to delete file from R2: ${error.message}`);
  }
};

module.exports = {
  uploadToR2,
  deleteFromR2,
};
