import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUniqueBySku(sku: string) {
    return this.prisma.product.findUnique({ where: { sku } });
  }

  findById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findActiveByIdWithDetails(id: string) {
    return this.prisma.product.findFirst({
      where: { id, isActive: true },
      include: { images: true, inventory: true, categories: { include: { category: true } } },
    });
  }

  findAllAdmin() {
    return this.prisma.product.findMany({
      include: { images: true, inventory: true, categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAdminFiltered(opts: { q?: string; isActive?: boolean }) {
    const where: Prisma.ProductWhereInput = {};
    if (opts.q && opts.q.trim().length > 0) {
      const t = opts.q.trim();
      where.OR = [
        { name: { contains: t, mode: 'insensitive' } },
        { sku: { contains: t, mode: 'insensitive' } },
        { description: { contains: t, mode: 'insensitive' } },
      ];
    }
    if (typeof opts.isActive === 'boolean') where.isActive = opts.isActive;
    return this.prisma.product.findMany({
      where,
      include: { images: true, inventory: true, categories: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listWithFilters(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput,
    page: number,
    pageSize: number,
  ) {
    return Promise.all([
      this.prisma.product.findMany({
        where,
        include: { images: true, inventory: true, categories: { include: { category: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
  }

  create(dto: CreateProductDto, actorUserId?: string) {
    const stock = dto.stock ?? 0;
    return this.prisma.product.create({
      data: {
        sku: dto.sku.trim(),
        name: dto.name.trim(),
        priceCents: dto.priceCents,
        description: dto.description?.trim(),
        ...(actorUserId ? { createdById: actorUserId, updatedById: actorUserId } : {}),
        inventory: { create: { quantity: stock } },
        ...(dto.categoryName
          ? {
              categories: {
                create: {
                  category: {
                    connectOrCreate: {
                      where: { name: dto.categoryName.trim() },
                      create: { name: dto.categoryName.trim() },
                    },
                  },
                },
              },
            }
          : {}),
        ...(dto.imageUrl
          ? {
              images: {
                create: [{ url: dto.imageUrl.trim(), sortOrder: 0 }],
              },
            }
          : {}),
      },
      include: { images: true, inventory: true, categories: { include: { category: true } } },
    });
  }

  async update(id: string, dto: UpdateProductDto, actorUserId?: string) {
    await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(actorUserId ? { updatedById: actorUserId } : {}),
      },
    });

    if (dto.stock !== undefined) {
      await this.prisma.inventory.upsert({
        where: { productId: id },
        update: { quantity: dto.stock },
        create: { productId: id, quantity: dto.stock },
      });
    }

    if (dto.imageUrl !== undefined && dto.imageUrl.trim().length > 0) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      await this.prisma.productImage.create({
        data: { productId: id, url: dto.imageUrl.trim(), sortOrder: 0 },
      });
    }

    return this.prisma.product.findUnique({
      where: { id },
      include: { images: true, inventory: true, categories: { include: { category: true } } },
    });
  }

  softDelete(id: string, actorUserId?: string) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false, ...(actorUserId ? { updatedById: actorUserId } : {}) },
    });
  }
}
