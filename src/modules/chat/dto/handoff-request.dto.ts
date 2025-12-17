import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsOptional, IsString } from 'class-validator';

export class HandoffRequestDto {
    @ApiProperty({
        example: 123,
        description: 'Chat session ID to transfer to human agent'
    })
    @IsInt()
    @IsPositive()
    session_id: number;

    @ApiProperty({
        example: 'customer_request',
        description: 'Reason for handoff',
        required: false
    })
    @IsString()
    @IsOptional()
    reason?: string;
}

export class AcceptConversationDto {
    @ApiProperty({
        example: 1,
        description: 'Admin ID accepting the conversation'
    })
    @IsInt()
    @IsPositive()
    admin_id: number;
}
