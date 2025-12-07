import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalApiKeyGuard } from './internal-api-key.guard';

describe('InternalApiKeyGuard', () => {
    let guard: InternalApiKeyGuard;
    let configService: ConfigService;

    const mockConfigService = {
        get: jest.fn(),
    };

    const createMockExecutionContext = (apiKey?: string): ExecutionContext => ({
        switchToHttp: () => ({
            getRequest: () => ({
                headers: {
                    'x-internal-api-key': apiKey,
                },
            }),
        }),
    } as ExecutionContext);

    beforeEach(() => {
        configService = mockConfigService as any;
        guard = new InternalApiKeyGuard(configService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('canActivate', () => {
        it('should return true when API key is valid', () => {
            const validKey = 'test-api-key-123';
            mockConfigService.get.mockReturnValue(validKey);

            const context = createMockExecutionContext(validKey);
            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(mockConfigService.get).toHaveBeenCalledWith('INTERNAL_API_KEY');
        });

        it('should throw UnauthorizedException when API key is missing', () => {
            mockConfigService.get.mockReturnValue('valid-key');

            const context = createMockExecutionContext(undefined);

            expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(context)).toThrow('Invalid or missing internal API key');
        });

        it('should throw UnauthorizedException when API key is invalid', () => {
            mockConfigService.get.mockReturnValue('valid-key');

            const context = createMockExecutionContext('wrong-key');

            expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(context)).toThrow('Invalid or missing internal API key');
        });

        it('should throw Error when INTERNAL_API_KEY is not configured', () => {
            mockConfigService.get.mockReturnValue(undefined);

            const context = createMockExecutionContext('some-key');

            expect(() => guard.canActivate(context)).toThrow(Error);
            expect(() => guard.canActivate(context)).toThrow('INTERNAL_API_KEY is not configured');
        });
    });
});
