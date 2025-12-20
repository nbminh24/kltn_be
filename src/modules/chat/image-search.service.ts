import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';
import { ImageSearchResponseDto } from './dto/image-search.dto';

@Injectable()
export class ImageSearchService {
    private readonly logger = new Logger(ImageSearchService.name);
    private readonly apiUrl: string;
    private readonly apiKey: string;

    constructor(private configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('FASTAPI_SERVICE_URL') || 'http://localhost:8000';
        this.apiKey = this.configService.get<string>('IMAGE_SEARCH_API_KEY') || '';

        if (!this.apiKey) {
            this.logger.warn('⚠️  IMAGE_SEARCH_API_KEY not configured');
        }

        this.logger.log(`📸 Image Search Service initialized: ${this.apiUrl}`);
    }

    /**
     * Search similar products by image
     * @param imageBuffer - Image file buffer
     * @param filename - Original filename
     * @returns Search results with product IDs and similarity scores
     */
    async searchByImage(imageBuffer: Buffer, filename: string): Promise<ImageSearchResponseDto> {
        try {
            this.logger.log(`🔍 Searching similar products for image: ${filename}`);

            // Create form data
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: filename,
                contentType: 'image/jpeg',
            });

            // Call Image Search Service
            const startTime = Date.now();
            const response = await axios.post(
                `${this.apiUrl}/search`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'X-API-Key': this.apiKey,
                    },
                    timeout: 60000, // 60 seconds timeout for AI processing
                }
            );

            const queryTime = Date.now() - startTime;
            this.logger.log(`✅ Image search completed in ${queryTime}ms, found ${response.data.results?.length || 0} results`);

            return {
                success: true,
                results: response.data.results || [],
                query_time_ms: queryTime,
            };

        } catch (error) {
            this.logger.error(`❌ Image search failed: ${error.message}`);

            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    throw new HttpException(
                        'Image Search Service is not available',
                        HttpStatus.SERVICE_UNAVAILABLE
                    );
                }

                if (error.response) {
                    throw new HttpException(
                        error.response.data?.message || 'Image search failed',
                        error.response.status
                    );
                }
            }

            throw new HttpException(
                'Failed to process image search',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Health check for Image Search Service
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.apiUrl}/health`, {
                timeout: 3000,
            });
            return response.status === 200;
        } catch (error) {
            this.logger.warn(`Image Search Service health check failed: ${error.message}`);
            return false;
        }
    }
}
