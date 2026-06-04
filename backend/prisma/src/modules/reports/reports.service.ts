import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { RedisService } from '../../common/cache/redis.service';
import {
  parseExportFormat,
  rowsToCsv,
  rowsToJson,
  rowsToXlsxBuffer,
  type ExportFormat,
} from '../../common/export/export-formats';
import { ReportsRepository } from './reports.repository';

export type SalesReportFilters = {
  days?: number;
  from?: string;
  to?: string;
  status?: string;
  customerEmail?: string;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepo: ReportsRepository,
    private readonly cache: RedisService,
  ) {}

  private buildWhere(f: SalesReportFilters): { where: Prisma.OrderWhereInput; cacheTag: string } {
    const where: Prisma.OrderWhereInput = {};
    const parts: string[] = [];

    if (f.from || f.to) {
      where.createdAt = {};
      if (f.from) {
        const d = new Date(f.from);
        if (!Number.isNaN(d.getTime())) {
          where.createdAt.gte = d;
          parts.push(`from:${d.toISOString()}`);
        }
      }
      if (f.to) {
        const d = new Date(f.to);
        if (!Number.isNaN(d.getTime())) {
          where.createdAt.lte = d;
          parts.push(`to:${d.toISOString()}`);
        }
      }
    } else {
      const safeDays =
        f.days !== undefined && Number.isFinite(f.days) && f.days > 0 && f.days <= 365
          ? Math.floor(Number(f.days))
          : 30;
      const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: since };
      parts.push(`days:${safeDays}`);
    }

    const statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    if (f.status && statuses.includes(f.status as OrderStatus)) {
      where.status = f.status as OrderStatus;
      parts.push(`st:${f.status}`);
    }

    if (f.customerEmail?.trim()) {
      where.customer = { email: { contains: f.customerEmail.trim(), mode: 'insensitive' } };
      parts.push(`em:${f.customerEmail.trim()}`);
    }

    return { where, cacheTag: parts.join('|') || 'default' };
  }

  async salesSummary(filters: SalesReportFilters = {}) {
    const { where, cacheTag } = this.buildWhere(filters);
    const cacheKey = `reports:sales-summary:v2:${cacheTag}`;

    const cached = await this.cache.getJson<{
      totalOrders: number;
      totalRevenueCents: number;
      byStatus: Record<string, { count: number; totalCents: number }>;
      filterSummary: string;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const orders = await this.reportsRepo.listOrdersFiltered(where);

    const byStatus: Record<string, { count: number; totalCents: number }> = {};
    for (const o of orders) {
      const key = o.status;
      byStatus[key] ??= { count: 0, totalCents: 0 };
      byStatus[key].count += 1;
      byStatus[key].totalCents += o.totalCents;
    }

    const totalOrders = orders.length;
    const totalRevenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);

    const result = {
      totalOrders,
      totalRevenueCents,
      byStatus,
      filterSummary: cacheTag,
    };
    await this.cache.setJson(cacheKey, result, 60);
    return result;
  }

  private encodeReportExport(format: ExportFormat, rows: Record<string, unknown>[]) {
    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: 'sales-report.json',
        body: rowsToJson(rows),
      };
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'sales-report.xlsx',
        body: rowsToXlsxBuffer(rows, 'sales'),
      };
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: 'sales-report.csv',
      body: rowsToCsv(rows),
    };
  }

  async exportSalesDetail(formatRaw: string | undefined, filters: SalesReportFilters) {
    const format = parseExportFormat(formatRaw);
    const { where } = this.buildWhere(filters);
    const orders = await this.reportsRepo.listOrdersFiltered(where);
    const rows = orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      totalCents: o.totalCents,
      subtotalCents: o.subtotalCents,
      customerEmail: o.customer.email,
      customerName: o.customer.fullName,
    })) as Record<string, unknown>[];
    return this.encodeReportExport(format, rows);
  }
}

