import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private authRepo: AuthRepository,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private buildTokenPayload(user: Awaited<ReturnType<AuthRepository['findUserByEmail']>>) {
    if (!user) throw new UnauthorizedException();
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];
    return { sub: user.id, email: user.email, roles, permissions };
  }

  private signAccess(payload: object) {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m',
    });
  }

  private signRefresh(payload: object) {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });
  }

  async register(dto: RegisterDto) {
    const exists = await this.authRepo.findUserByEmail(dto.email);
    if (exists) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 12);
    const userRole = await this.prisma.role.findUnique({ where: { name: 'USER' } });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        fullName: `${dto.firstName} ${dto.lastName}`,
        firstName: dto.firstName,
        lastName: dto.lastName,
        userRoles: userRole
          ? { create: { roleId: userRole.id } }
          : undefined,
      },
    });

    return { message: 'Registration successful', userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash ?? '');
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    const payload = this.buildTokenPayload(user);
    const accessToken = this.signAccess(payload);
    const refreshToken = this.signRefresh(payload);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.authRepo.saveRefreshToken({ userId: user.id, tokenHash, expiresAt });

    return { accessToken, refreshToken };
  }

  async refresh(dto: RefreshDto) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, revokedAt: null },
    });

    let matched: (typeof stored)[0] | undefined;
    for (const t of stored) {
      if (await bcrypt.compare(dto.refreshToken, t.tokenHash)) {
        matched = t;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Refresh token not found');
    if (matched.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    await this.authRepo.revokeRefreshToken(matched.id);

    const user = await this.authRepo.findUserById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Account disabled');

    const newPayload = this.buildTokenPayload(user);
    const accessToken = this.signAccess(newPayload);
    const refreshToken = this.signRefresh(newPayload);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.authRepo.saveRefreshToken({ userId: user.id, tokenHash, expiresAt });

    return { accessToken, refreshToken };
  }

  async logout(userId: string) {
    await this.authRepo.revokeAllUserTokens(userId);
    return { message: 'Logged out successfully' };
  }

  async changePassword(dto: ChangePasswordDto) {
    const user = await this.authRepo.findUserByEmail(dto.email);
    if (!user) throw new BadRequestException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash ?? '');
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    await this.authRepo.revokeAllUserTokens(user.id);
    return { message: 'Password changed successfully' };
  }

  async googleLogin(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
  }) {
    let user = await this.authRepo.findUserByEmail(googleUser.email);

    if (!user) {
      const userRole = await this.prisma.role.findUnique({ where: { name: 'USER' } });
      await this.prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: `${googleUser.firstName} ${googleUser.lastName}`,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          passwordHash: null,
          userRoles: userRole ? { create: { roleId: userRole.id } } : undefined,
        },
      });
      user = await this.authRepo.findUserByEmail(googleUser.email);
    }

    if (!user) throw new UnauthorizedException();

    const payload = this.buildTokenPayload(user);
    return {
      accessToken: this.signAccess(payload),
      refreshToken: this.signRefresh(payload),
    };
  }
}
