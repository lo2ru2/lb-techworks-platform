import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listOrdersSince(since: Date) {
    return this.prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true, totalCents: true, createdAt: true },
    });
  }

  listOrdersFiltered(where: Prisma.OrderWhereInput) {
    return this.prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        totalCents: true,
        subtotalCents: true,
        createdAt: true,
        customer: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
  }
}
