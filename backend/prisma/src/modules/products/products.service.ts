import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RedisService } from '../../common/cache/redis.service';
import {
  parseExportFormat,
  rowsToCsv,
  rowsToJson,
  rowsToXlsxBuffer,
  type ExportFormat,
} from '../../common/export/export-formats';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './products.repository';
import { AnalyticsService } from '../analytics/analytics.service';

type ListProductsQuery = {
  q?: string;
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page: number;
  pageSize: number;
};

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    private readonly productsRepo: ProductsRepository,
    private readonly cache: RedisService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** Pastron cache të vjetër të listës (para heqjes së cache nga `list`). */
  async onModuleInit() {
    await this.cache.delByPrefix('products:list:');
  }

  async list(query: ListProductsQuery) {
    const page = Number.isFinite(query.page) && query.page > 0 ? query.page : 1;
    const pageSize =
      Number.isFinite(query.pageSize) && query.pageSize > 0 && query.pageSize <= 250 ? query.pageSize : 12;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (query.q && query.q.trim().length > 0) {
      where.OR = [
        { name: { contains: query.q.trim(), mode: 'insensitive' } },
        { sku: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }

    const priceRange: Prisma.IntFilter = {};
    if (typeof query.minPriceCents === 'number') priceRange.gte = query.minPriceCents;
    if (typeof query.maxPriceCents === 'number') priceRange.lte = query.maxPriceCents;
    if (Object.keys(priceRange).length > 0) where.priceCents = priceRange;

    if (query.category && query.category.trim().length > 0) {
      const cat = query.category.trim();
      where.categories = {
        some: { category: { name: { equals: cat, mode: 'insensitive' } } },
      };
    }

    const orderBy =
      query.sort === 'price_asc'
        ? { priceCents: 'asc' as const }
        : query.sort === 'price_desc'
          ? { priceCents: 'desc' as const }
          : { createdAt: 'desc' as const };

    const [items, total] = await this.productsRepo.listWithFilters(where, orderBy, page, pageSize);

    if (query.q?.trim()) {
      void this.analytics.trackSearch({
        query: query.q.trim(),
        filters: {
          category: query.category,
          minPrice: query.minPriceCents,
          maxPrice: query.maxPriceCents,
          sortBy: query.sort,
        },
        resultCount: total,
      });
    }

    const result = {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
    return result;
  }

  async findById(id: string, meta?: { userId?: string; sessionId?: string; ip?: string; userAgent?: string }) {
    const cacheKey = `products:one:${id}`;
    const cached = await this.cache.getJson<{ name?: string }>(cacheKey);
    if (cached) {
      void this.analytics.trackProductView({ productId: id, productName: (cached as { name?: string }).name ?? id, ...meta });
      return cached;
    }
    const p = await this.productsRepo.findActiveByIdWithDetails(id);
    if (p) {
      await this.cache.setJson(cacheKey, p, 120);
      void this.analytics.trackProductView({ productId: id, productName: (p as { name?: string }).name ?? id, ...meta });
    }
    return p;
  }

  async listAllAdmin(q?: string, isActiveRaw?: string) {
    let isActive: boolean | undefined;
    if (isActiveRaw === 'true') isActive = true;
    else if (isActiveRaw === 'false') isActive = false;

    const filtered = !!(q && q.trim()) || typeof isActive === 'boolean';

    if (!filtered) {
      const cacheKey = 'products:admin:list';
      const cached = await this.cache.getJson<unknown[]>(cacheKey);
      if (cached) return cached;
      const list = await this.productsRepo.findAllAdmin();
      await this.cache.setJson(cacheKey, list, 30);
      return list;
    }

    return this.productsRepo.findAdminFiltered({ q, isActive });
  }

  private flattenProductForExport(p: {
    id: string;
    sku: string;
    name: string;
    priceCents: number;
    isActive: boolean;
    description: string | null;
    inventory: { quantity: number } | null;
    categories: { category: { name: string } }[];
  }) {
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      priceCents: p.priceCents,
      isActive: p.isActive,
      description: p.description ?? '',
      stock: p.inventory?.quantity ?? 0,
      categories: p.categories.map((c) => c.category.name).join(';'),
    } as Record<string, unknown>;
  }

  async exportAdmin(formatRaw: string | undefined, q?: string, isActiveRaw?: string) {
    const format = parseExportFormat(formatRaw);
    const list = await this.listAllAdmin(q, isActiveRaw);
    const rows = (list as Parameters<ProductsService['flattenProductForExport']>[0][]).map((p) =>
      this.flattenProductForExport(p),
    );
    return this.encodeExport(format, rows, 'products');
  }

  private encodeExport(format: ExportFormat, rows: Record<string, unknown>[], baseName: string) {
    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: `${baseName}.json`,
        body: rowsToJson(rows),
      };
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${baseName}.xlsx`,
        body: rowsToXlsxBuffer(rows, baseName),
      };
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `${baseName}.csv`,
      body: rowsToCsv(rows),
    };
  }

  async importMany(items: CreateProductDto[], actorUserId: string) {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const dto = items[i];
      try {
        const existing = await this.productsRepo.findUniqueBySku(dto.sku.trim());
        if (existing) {
          await this.productsRepo.update(
            existing.id,
            {
              name: dto.name,
              priceCents: dto.priceCents,
              description: dto.description,
              imageUrl: dto.imageUrl,
            },
            actorUserId,
          );
        } else {
          await this.productsRepo.create(dto, actorUserId);
        }
        imported += 1;
      } catch (e) {
        errors.push(`Rreshti ${i + 1}: ${e instanceof Error ? e.message : 'gabim'}`);
      }
    }
    await this.invalidateProductsCache();
    return { imported, errors };
  }

  async create(dto: CreateProductDto, actorUserId?: string) {
    const existing = await this.productsRepo.findUniqueBySku(dto.sku);
    if (existing) throw new ConflictException('SKU ekziston tashmë');
    const product = await this.productsRepo.create(dto, actorUserId);
    await this.invalidateProductsCache(product.id);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, actorUserId?: string) {
    const p = await this.productsRepo.findById(id);
    if (!p) throw new NotFoundException('Produkti nuk u gjet');
    const updated = await this.productsRepo.update(id, dto, actorUserId);
    await this.invalidateProductsCache(id);
    return updated;
  }

  async softDelete(id: string, actorUserId?: string) {
    const p = await this.productsRepo.findById(id);
    if (!p) throw new NotFoundException('Produkti nuk u gjet');
    const deleted = await this.productsRepo.softDelete(id, actorUserId);
    await this.invalidateProductsCache(id);
    return deleted;
  }

  private async invalidateProductsCache(productId?: string) {
    await this.cache.delByPrefix('products:list:');
    await this.cache.delByPrefix('products:admin:list');
    if (productId) await this.cache.delByPrefix(`products:one:${productId}`);
  }
}

