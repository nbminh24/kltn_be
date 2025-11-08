import { Module, Global } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { QueryBuilderService } from './services/query-builder.service';
import { StorageService } from './services/storage.service';
import { SlugService } from './services/slug.service';

@Global()
@Module({
  providers: [JwtAuthGuard, AdminGuard, QueryBuilderService, StorageService, SlugService],
  exports: [JwtAuthGuard, AdminGuard, QueryBuilderService, StorageService, SlugService],
})
export class CommonModule {}
