import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3 = new S3Client({
    endpoint: process.env.RUSTFS_ENDPOINT,
    region: process.env.RUSTFS_REGION || 'us-east-1',

    credentials: {
      accessKeyId: process.env.RUSTFS_ACCESS_KEY!,
      secretAccessKey: process.env.RUSTFS_SECRET_KEY!,
    },
    forcePathStyle: true,
  });

  private readonly bucket = process.env.RUSTFS_BUCKET || 'meter-readings';

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ success: boolean; url: string }> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return {
      success: true,
      url: `${process.env.RUSTFS_PUBLIC_URL}/${this.bucket}/${key}`,
    };
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Optimizes a base64 image (resize to 1024px, jpeg q80) and uploads it
   * under `${folder}/${uuid}.jpg`. Returns the storage key or undefined.
   */
  async uploadOptimizedImage(
    imageBase64?: string,
    folder?: string,
  ): Promise<string | undefined> {
    if (!imageBase64) return undefined;

    try {
      const base64Data = imageBase64.split(',')[1] ?? imageBase64;
      const buffer = Buffer.from(base64Data, 'base64');
      const optimized = await sharp(buffer)
        .resize({ width: 1024, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer();
      this.logger.log(
        `Image optimized: ${buffer.length} bytes -> ${optimized.length} bytes (${(optimized.length / 1024).toFixed(2)} KB)`,
      );

      const key = `${folder}/${uuidv4()}.jpg`;
      const result = await this.upload(key, optimized, 'image/jpeg');
      if (result.success) {
        return key;
      }
    } catch (err) {
      this.logger.error(
        'Error processing/uploading image',
        (err as Error)?.stack,
      );
      // Continue without image if processing or upload fails
    }
    return undefined;
  }
}

export const StorageServiceToken = 'storage-service';
