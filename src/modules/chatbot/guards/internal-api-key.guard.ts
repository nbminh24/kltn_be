import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard to protect internal APIs that should only be accessible by Rasa chatbot server.
 * Validates X-Internal-Api-Key header against configured secret.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-internal-api-key'];
        const validKey = this.configService.get<string>('INTERNAL_API_KEY');

        if (!validKey) {
            throw new Error('INTERNAL_API_KEY is not configured in environment variables');
        }

        if (!apiKey || apiKey !== validKey) {
            throw new UnauthorizedException('Invalid or missing internal API key');
        }

        return true;
    }
}
