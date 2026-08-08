// ============================================
// DineBoard — AWS S3 Storage Service
// Handles S3 uploads, PDF invoice backups, and file streaming
// ============================================

const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

class S3Service {
  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  }

  isConfigured() {
    return !!(this.bucket && this.accessKeyId && this.secretAccessKey);
  }

  getClient() {
    if (!this.isConfigured()) return null;
    return new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  /**
   * Upload a Buffer to AWS S3
   * @param {Buffer} buffer - File buffer (e.g. PDF or Image)
   * @param {string} key - S3 Key, e.g. "invoices/tinas-fusion-bistro/INV-20260809-1234.pdf"
   * @param {string} contentType - e.g. "application/pdf"
   */
  async uploadBuffer(buffer, key, contentType = 'application/pdf') {
    if (!this.isConfigured()) {
      console.log(`⚠️ S3 not configured. Skipping S3 upload for key: ${key}`);
      return { success: false, message: 'S3 not configured' };
    }

    try {
      const s3 = this.getClient();
      await s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const s3Url = `/api/uploads/s3/${key}`;
      console.log(`☁️ Successfully uploaded to S3: ${key}`);
      return { success: true, key, url: s3Url };
    } catch (error) {
      console.error(`❌ S3 Upload Failed for ${key}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch object from S3
   * @param {string} key - S3 object key
   */
  async getObjectStream(key) {
    if (!this.isConfigured()) return null;
    try {
      const s3 = this.getClient();
      const result = await s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return result;
    } catch (error) {
      console.error(`❌ S3 GetObject Error for ${key}:`, error.message);
      return null;
    }
  }
}

module.exports = new S3Service();
