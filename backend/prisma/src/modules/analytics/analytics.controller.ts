import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiresPermissions('products.read')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.analytics.getDashboardStats();
  }

  @Get('products/top')
  getTopProducts(@Query('limit') limit?: string) {
    return this.analytics.getTopProducts(limit ? Number(limit) : 20);
  }

  @Get('products/:id/views')
  getProductViews(@Param('id') id: string) {
    return this.analytics.getProductViewStats(id);
  }

  @Get('searches/top')
  getTopSearches(@Query('limit') limit?: string) {
    return this.analytics.getTopSearches(limit ? Number(limit) : 20);
  }
}
