import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthModule } from '../auth/auth.module';
import { ProductsRepository } from './products.repository';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AuthModule, AnalyticsModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}

