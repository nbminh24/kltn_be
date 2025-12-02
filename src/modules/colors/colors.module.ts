import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Color } from '../../entities/color.entity';
import { ColorsService } from './colors.service';
import { AdminColorsController } from './admin-colors.controller';
import { ColorsController } from './colors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Color])],
  controllers: [AdminColorsController, ColorsController],
  providers: [ColorsService],
  exports: [ColorsService],
})
export class ColorsModule { }
