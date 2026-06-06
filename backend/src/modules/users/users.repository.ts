import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
    });
  }

  listAdmin(opts: { q?: string }) {
    const where: Prisma.UserWhereInput = {};
    if (opts.q?.trim()) {
      const t = opts.q.trim();
      where.OR = [
        { email: { contains: t, mode: 'insensitive' } },
        { fullName: { contains: t, mode: 'insensitive' } },
        { firstName: { contains: t, mode: 'insensitive' } },
        { lastName: { contains: t, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: { include: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });
  }

  findByIdWithPassword(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
  }

  updateMe(userId: string, data: { firstName?: string; lastName?: string; fullName?: string; phone?: string | null; email?: string }) {
    const update: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) {
      update.firstName = data.firstName;
      update.lastName  = data.lastName ?? undefined;
      update.fullName  = data.fullName ?? `${data.firstName} ${data.lastName ?? ''}`.trim();
    }
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.email !== undefined) update.email = data.email;
    return this.prisma.user.update({
      where: { id: userId },
      data: update,
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
