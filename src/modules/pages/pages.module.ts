import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagesController } from './pages.controller';
import { AdminPagesController } from './admin-pages.controller';
import { PagesService } from './pages.service';
import { Page } from '../../entities/page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Page])],
  controllers: [PagesController, AdminPagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
