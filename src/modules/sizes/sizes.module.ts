import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Size } from '../../entities/size.entity';
import { SizesService } from './sizes.service';
import { AdminSizesController } from './admin-sizes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Size])],
  controllers: [AdminSizesController],
  providers: [SizesService],
  exports: [SizesService],
})
export class SizesModule {}
