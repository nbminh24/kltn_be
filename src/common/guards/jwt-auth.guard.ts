import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 🚨 TEMPORARY: AUTHENTICATION DISABLED FOR TESTING
    // Sử dụng user có sẵn trong database thay vì mock
    
    const request = context.switchToHttp().getRequest();
    const path = request.url;
    
    // Chọn user dựa vào path
    // Nếu path bắt đầu bằng /admin/ thì dùng user admin
    // Nếu không thì dùng user customer
    const userId = path.startsWith('/admin') ? 'user_admin_1' : 'user_1';
    
    // Load user từ database
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'role', 'status'],
    });
    
    if (user) {
      request.user = {
        userId: user.id,
        email: user.email,
        sub: user.id,
        role: user.role,
        name: user.name,
      };
    }
    
    return true;

    // const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
    //   context.getHandler(),
    //   context.getClass(),
    // ]);

    // if (isPublic) {
    //   return true;
    // }

    // return super.canActivate(context);
  }
}
