import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { ReportsService, type SalesReportFilters } from './reports.service';

function salesFiltersFromQuery(q: {
  days?: string;
  from?: string;
  to?: string;
  status?: string;
  customerEmail?: string;
}): SalesReportFilters {
  return {
    days: q.days ? Number(q.days) : undefined,
    from: q.from,
    to: q.to,
    status: q.status,
    customerEmail: q.customerEmail,
  };
}

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get('sales-summary/export')
  async exportSales(
    @Res({ passthrough: false }) res: Response,
    @Query('format') format?: string,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('customerEmail') customerEmail?: string,
  ) {
    const pack = await this.reports.exportSalesDetail(
      format,
      salesFiltersFromQuery({ days, from, to, status, customerEmail }),
    );
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get('sales-summary')
  async salesSummary(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('customerEmail') customerEmail?: string,
  ) {
    return this.reports.salesSummary(salesFiltersFromQuery({ days, from, to, status, customerEmail }));
  }
}

