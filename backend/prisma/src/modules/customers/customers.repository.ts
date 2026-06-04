import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(opts: { q?: string }) {
    const where: Prisma.CustomerWhereInput = {};
    if (opts.q?.trim()) {
      const t = opts.q.trim();
      where.OR = [
        { email: { contains: t, mode: 'insensitive' } },
        { fullName: { contains: t, mode: 'insensitive' } },
        { phone: { contains: t, mode: 'insensitive' } },
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  upsertFromImport(email: string, fullName: string, phone: string | null, actorUserId: string) {
    return this.prisma.customer.upsert({
      where: { email: email.toLowerCase().trim() },
      update: { fullName: fullName.trim(), phone: phone?.trim() || null, updatedById: actorUserId },
      create: {
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
  }
}
