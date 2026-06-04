import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  findAll(skip: number, take: number) {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        isActive: true,
        status: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  count() {
    return this.prisma.user.count();
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  update(id: string, data: { firstName?: string; lastName?: string; fullName?: string; isActive?: boolean }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  assignRole(userId: string, roleId: string) {
    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });
  }

  removeRole(userId: string, roleId: string) {
    return this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }
}
