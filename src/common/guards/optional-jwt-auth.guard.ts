import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        // Always return true - allow both authenticated and guest users
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any) {
        // If JWT is invalid or missing, return null instead of throwing error
        // This allows guest users to proceed
        if (err || !user) {
            console.log(' OptionalJwtAuthGuard - No valid token, treating as guest user');
            return null;
        }
        console.log(' OptionalJwtAuthGuard - Token validated, user:', user?.sub);
        return user;
    }
}
