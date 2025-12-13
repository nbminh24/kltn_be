import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatSession, ChatMessage]),
        HttpModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
        }),
    ],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService],
})
export class ChatModule { }
