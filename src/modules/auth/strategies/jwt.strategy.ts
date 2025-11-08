import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../../entities/customer.entity';
import { Admin } from '../../../entities/admin.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Kiểm tra type trong payload để biết đây là admin hay customer
    if (payload.type === 'admin') {
      // Admin authentication
      const admin = await this.adminRepository.findOne({
        where: { id: payload.sub },
      });

      if (!admin) {
        throw new UnauthorizedException('Admin không tồn tại');
      }

      return { 
        sub: admin.id, 
        email: admin.email, 
        role: admin.role,
        type: 'admin'
      };
    } else {
      // Customer authentication
      const customer = await this.customerRepository.findOne({
        where: { id: payload.sub },
      });

      if (!customer || customer.status !== 'active') {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc chưa được kích hoạt');
      }

      return { 
        sub: customer.id, 
        email: customer.email,
        type: 'customer'
      };
    }
  }
}
