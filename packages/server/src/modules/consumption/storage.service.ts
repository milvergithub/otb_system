import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import type { Readable } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mime types accepted for non-image documents. Anything outside this list is
 * rejected so the bucket never stores executable content.
 */
const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const DATA_URL_PATTERN = /^data:([\w/+.-]+);base64,(.+)$/s;

/** Hard cap for a single decoded document, independent of BODY_LIMIT. */
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export interface StoredDocument {
  file_key: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

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
      url: this.getPublicUrl(key),
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
   * Public URL for a stored object. Used when a direct link is enough.
   */
  getPublicUrl(key: string): string {
    return `${process.env.RUSTFS_PUBLIC_URL}/${this.bucket}/${key}`;
  }

  /**
   * Reads an object back for streaming through the API. Used so the client
   * never needs bucket credentials or CORS access to the storage endpoint.
   */
  async getObjectStream(
    key: string,
  ): Promise<{ body: Readable; contentType?: string }> {
    const result = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    return {
      body: result.Body as Readable,
      contentType: result.ContentType,
    };
  }

  /**
   * Uploads a base64 payload as-is (no image optimization) for documents such
   * as invoices or receipts. Returns the stored metadata.
   */
  async uploadDocument(
    fileBase64: string,
    folder: string,
    fileName?: string,
  ): Promise<StoredDocument | null> {
    const match = DATA_URL_PATTERN.exec(fileBase64.trim());
    const mimeType = match ? match[1].toLowerCase() : 'application/pdf';
    const extension = ALLOWED_DOCUMENT_TYPES[mimeType];
    if (!extension) {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }

    const base64Data = match ? match[2] : fileBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0) {
      throw new Error('The uploaded document is empty');
    }
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      throw new Error(
        `The uploaded document exceeds ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB`,
      );
    }

    const key = `${folder}/${uuidv4()}.${extension}`;
    const result = await this.upload(key, buffer, mimeType);
    if (!result.success) return null;

    return {
      file_key: key,
      file_name: this.sanitizeFileName(fileName) ?? `${uuidv4()}.${extension}`,
      mime_type: mimeType,
      file_size: buffer.length,
    };
  }

  private sanitizeFileName(fileName?: string): string | null {
    if (!fileName) return null;
    const cleaned = fileName
      .replace(/[\\/]+/g, '-')
      .replace(/[^\w.\- ]+/g, '')
      .trim();
    return cleaned ? cleaned.slice(0, 200) : null;
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
