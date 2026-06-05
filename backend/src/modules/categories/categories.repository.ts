import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(opts: { q?: string }) {
    const where: Prisma.CategoryWhereInput = {};
    if (opts.q?.trim()) {
      where.name = { contains: opts.q.trim(), mode: 'insensitive' };
    }
    return this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  upsertByName(name: string, actorUserId: string) {
    const n = name.trim();
    return this.prisma.category.upsert({
      where: { name: n },
      update: { updatedById: actorUserId },
      create: { name: n, createdById: actorUserId, updatedById: actorUserId },
    });
  }
}
