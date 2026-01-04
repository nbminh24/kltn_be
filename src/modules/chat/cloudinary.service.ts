import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');

    if (!cloudinaryUrl) {
      this.logger.error('CLOUDINARY_URL not found in environment variables');
      return;
    }

    // Parse cloudinary://api_key:api_secret@cloud_name
    const url = new URL(cloudinaryUrl);
    cloudinary.config({
      cloud_name: url.hostname,
      api_key: url.username,
      api_secret: url.password,
    });

    this.logger.log(`✅ Cloudinary configured: ${url.hostname}`);
  }

  /**
   * Upload image buffer to Cloudinary
   */
  async uploadImage(buffer: Buffer, filename: string): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'chat_images',
          public_id: `${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(error);
          } else {
            this.logger.log(`✅ Image uploaded to Cloudinary: ${result.secure_url}`);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        },
      );

      const stream = Readable.from(buffer);
      stream.pipe(uploadStream);
    });
  }
}
