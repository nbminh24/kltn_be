import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    healthCheck() {
        return {
            status: 'ok',
            message: 'KLTN E-commerce Backend is running',
            timestamp: new Date().toISOString(),
        };
    }
}
