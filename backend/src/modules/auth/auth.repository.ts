import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const userWithRolesInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRolesInclude }>;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: userWithRolesInclude,
    });
  }

  findUserByIdWithRoles(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: userWithRolesInclude,
    });
  }

  findRoleByName(name: string) {
    return this.prisma.role.findUnique({ where: { name } });
  }

  createUserWithRole(input: {
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    passwordHash: string;
    phone?: string | null;
    role: Role;
  }) {
    return this.prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        phone: input.phone ?? null,
        roles: {
          create: {
            role: { connect: { id: input.role.id } },
          },
        },
      },
    });
  }

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  findActiveRefreshToken(refreshTokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash: refreshTokenHash, revokedAt: null },
      include: { user: { include: userWithRolesInclude } },
    });
  }

  createAuditLog(data: {
    userId?: string;
    action: string;
    entity?: string;
    entityId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldValue?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newValue?: any;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityType: data.entity,
        entityId: data.entityId,
        oldValue: data.oldValue ?? Prisma.JsonNull,
        newValue: data.newValue ?? Prisma.JsonNull,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  findSimpleUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
