import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductView, ProductViewSchema } from './schemas/product-view.schema';
import { SearchQuery, SearchQuerySchema } from './schemas/search-query.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductView.name, schema: ProductViewSchema },
      { name: SearchQuery.name, schema: SearchQuerySchema },
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
