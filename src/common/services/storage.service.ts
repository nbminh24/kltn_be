import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    this.bucket = this.configService.get<string>('SUPABASE_STORAGE_BUCKET', 'lecas');

    // Debug log
    this.logger.log(`🔍 DEBUG - SUPABASE_URL: ${supabaseUrl ? 'EXISTS' : 'MISSING'}`);
    this.logger.log(
      `🔍 DEBUG - SUPABASE_SERVICE_KEY: ${supabaseKey ? 'EXISTS (length: ' + supabaseKey.length + ')' : 'MISSING'}`,
    );
    this.logger.log(`🔍 DEBUG - SUPABASE_STORAGE_BUCKET: ${this.bucket}`);

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        '⚠️ Supabase credentials not configured - Storage features will be disabled',
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log(`✅ Storage service initialized with bucket: ${this.bucket}`);
  }

  /**
   * Upload single file to Supabase Storage
   * @param file Express.Multer.File
   * @param folder Folder path in bucket (e.g., 'products', 'variants')
   * @returns Public URL of uploaded file
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!this.supabase) {
      throw new Error(
        'Storage service not configured - please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env',
      );
    }

    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${folder}/${timestamp}-${randomStr}-${file.originalname}`;

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Failed to upload file: ${error.message}`);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage.from(this.bucket).getPublicUrl(data.path);

      this.logger.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      this.logger.error(`❌ Upload error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: Express.Multer.File[], folder: string): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete file from Supabase Storage
   * @param fileUrl Full URL of file to delete
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.supabase) {
      throw new Error(
        'Storage service not configured - please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env',
      );
    }

    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split(`/storage/v1/object/public/${this.bucket}/`);

      if (pathParts.length < 2) {
        throw new Error('Invalid file URL format');
      }

      const filePath = pathParts[1];

      const { error } = await this.supabase.storage.from(this.bucket).remove([filePath]);

      if (error) {
        this.logger.error(`Failed to delete file: ${error.message}`);
        throw new Error(`Delete failed: ${error.message}`);
      }

      this.logger.log(`✅ File deleted successfully: ${filePath}`);
    } catch (error) {
      this.logger.error(`❌ Delete error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(fileUrls: string[]): Promise<void> {
    const deletePromises = fileUrls.map(url => this.deleteFile(url));
    await Promise.all(deletePromises);
  }
}
