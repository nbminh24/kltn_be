import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('🔍 AdminGuard - Full user object:', JSON.stringify(user, null, 2));
    console.log('🔍 AdminGuard - user.role:', user?.role);
    console.log('🔍 AdminGuard - user.type:', user?.type);

    if (!user) {
      console.error('❌ AdminGuard - No user object found');
      throw new ForbiddenException('User not authenticated');
    }

    // Check both type and role for admin access
    const isAdmin = user.type === 'admin' || user.role === 'admin';

    if (!isAdmin) {
      console.error('❌ AdminGuard - Access denied. User is not admin:', {
        type: user.type,
        role: user.role,
      });
      throw new ForbiddenException('Access denied. Admin role required.');
    }

    console.log('✅ AdminGuard - Access granted for admin user');
    return true;
  }
}
