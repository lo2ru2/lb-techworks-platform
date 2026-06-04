import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private usersRepo: UsersRepository,
    private prisma: PrismaService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.usersRepo.findAll(skip, limit),
      this.usersRepo.count(),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: { firstName?: string; lastName?: string; isActive?: boolean }) {
    await this.findOne(id);
    const fullName =
      dto.firstName || dto.lastName
        ? `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim()
        : undefined;
    return this.usersRepo.update(id, { ...dto, fullName });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.usersRepo.softDelete(id);
    return { message: 'User deactivated' };
  }

  async assignRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Role "${roleName}" not found`);
    await this.usersRepo.assignRole(userId, role.id);
    return { message: `Role ${roleName} assigned` };
  }

  async removeRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Role "${roleName}" not found`);
    await this.usersRepo.removeRole(userId, role.id);
    return { message: `Role ${roleName} removed` };
  }
}
