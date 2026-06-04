import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductView, ProductViewDocument } from './schemas/product-view.schema';
import { SearchQuery, SearchQueryDocument } from './schemas/search-query.schema';

@Injectable()
export class AnalyticsService {
  private readonly log = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(ProductView.name) private readonly viewModel: Model<ProductViewDocument>,
    @InjectModel(SearchQuery.name) private readonly searchModel: Model<SearchQueryDocument>,
  ) {}

  async trackProductView(data: {
    productId: string;
    productName: string;
    userId?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
  }) {
    try {
      await this.viewModel.create({
        productId: data.productId,
        productName: data.productName,
        userId: data.userId,
        sessionId: data.sessionId,
        ip: data.ip,
        userAgent: data.userAgent,
        viewedAt: new Date(),
      });
    } catch (e) {
      this.log.warn(`trackProductView failed: ${(e as Error).message}`);
    }
  }

  async trackSearch(data: {
    query: string;
    filters?: { category?: string; minPrice?: number; maxPrice?: number; sortBy?: string };
    resultCount: number;
    userId?: string;
    ip?: string;
  }) {
    if (!data.query?.trim()) return;
    try {
      await this.searchModel.create({
        query: data.query.trim(),
        filters: data.filters,
        resultCount: data.resultCount,
        userId: data.userId,
        ip: data.ip,
        searchedAt: new Date(),
      });
    } catch (e) {
      this.log.warn(`trackSearch failed: ${(e as Error).message}`);
    }
  }

  async getTopProducts(limit = 20) {
    try {
      return await this.viewModel.aggregate([
        { $group: { _id: '$productId', productName: { $last: '$productName' }, views: { $sum: 1 }, lastViewed: { $max: '$viewedAt' } } },
        { $sort: { views: -1 } },
        { $limit: limit },
        { $project: { productId: '$_id', productName: 1, views: 1, lastViewed: 1, _id: 0 } },
      ]);
    } catch (e) {
      this.log.warn(`getTopProducts failed: ${(e as Error).message}`);
      return [];
    }
  }

  async getTopSearches(limit = 20) {
    try {
      return await this.searchModel.aggregate([
        { $group: { _id: '$query', count: { $sum: 1 }, avgResults: { $avg: '$resultCount' }, lastSearched: { $max: '$searchedAt' } } },
        { $sort: { count: -1 } },
        { $limit: limit },
        { $project: { query: '$_id', count: 1, avgResults: { $round: ['$avgResults', 0] }, lastSearched: 1, _id: 0 } },
      ]);
    } catch (e) {
      this.log.warn(`getTopSearches failed: ${(e as Error).message}`);
      return [];
    }
  }

  async getProductViewStats(productId: string) {
    try {
      const [totalViews, last7Days, uniqueUsers] = await Promise.all([
        this.viewModel.countDocuments({ productId }),
        this.viewModel.countDocuments({
          productId,
          viewedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        this.viewModel.distinct('userId', { productId, userId: { $ne: null } }).then((ids) => ids.length),
      ]);
      return { productId, totalViews, last7Days, uniqueUsers };
    } catch (e) {
      this.log.warn(`getProductViewStats failed: ${(e as Error).message}`);
      return { productId, totalViews: 0, last7Days: 0, uniqueUsers: 0 };
    }
  }

  async getDashboardStats() {
    const [topProducts, topSearches, totalViews, totalSearches] = await Promise.allSettled([
      this.getTopProducts(10),
      this.getTopSearches(10),
      this.viewModel.countDocuments().catch(() => 0),
      this.searchModel.countDocuments().catch(() => 0),
    ]);
    return {
      topProducts:   topProducts.status   === 'fulfilled' ? topProducts.value   : [],
      topSearches:   topSearches.status   === 'fulfilled' ? topSearches.value   : [],
      totalViews:    totalViews.status     === 'fulfilled' ? totalViews.value    : 0,
      totalSearches: totalSearches.status === 'fulfilled' ? totalSearches.value : 0,
    };
  }
}
