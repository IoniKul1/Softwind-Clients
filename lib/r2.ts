import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = () => process.env.R2_BUCKET_NAME!

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient()
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType }),
    { expiresIn }
  )
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  const client = getClient()
  const bucket = BUCKET()
  const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
  if (!list.Contents?.length) return
  await client.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: list.Contents.map((o) => ({ Key: o.Key! })), Quiet: true },
  }))
}
