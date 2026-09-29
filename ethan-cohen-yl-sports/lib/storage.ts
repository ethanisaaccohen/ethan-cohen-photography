import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.B2_REGION || "us-west-004";
const endpoint = process.env.B2_ENDPOINT?.trim();
const bucket = process.env.B2_BUCKET?.trim();
const accessKeyId = process.env.B2_KEY_ID?.trim();
const secretAccessKey = process.env.B2_APPLICATION_KEY?.trim();

function getStorageClient() {
  if (!endpoint) {
    throw new Error("B2_ENDPOINT is missing.");
  }

  if (!endpoint.startsWith("https://")) {
    throw new Error("B2_ENDPOINT must start with https://");
  }

  try {
    new URL(endpoint);
  } catch {
    throw new Error("B2_ENDPOINT is not a valid URL.");
  }

  if (!accessKeyId) {
    throw new Error("B2_KEY_ID is missing.");
  }

  if (!secretAccessKey) {
    throw new Error("B2_APPLICATION_KEY is missing.");
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function signedUpload(key: string, contentType: string) {
  if (!bucket) {
    throw new Error("B2_BUCKET is missing.");
  }

  const s3 = getStorageClient();

  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    }),
    {
      expiresIn: 900,
    }
  );
}
