import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { AuthRepository, UserWithRoles } from './auth.repository';

type ClientMeta = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, firstName: string, lastName: string, meta: ClientMeta, phone?: string) {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    try {
      const existing = await this.authRepo.findSimpleUserByEmail(email);
      if (existing) throw new ConflictException('Ky email është i regjistruar');

      const userRole = await this.authRepo.findRoleByName('USER');
      if (!userRole) {
        throw new BadRequestException(
          'Roli USER mungon në databazë. Në folderin backend ekzekuto: npm run seed',
        );
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const created = await this.authRepo.createUserWithRole({
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        passwordHash,
        phone: phone?.trim() || null,
        role: userRole,
      });

      const user = await this.authRepo.findUserByIdWithRoles(created.id);
      if (!user) {
        throw new BadRequestException('Përdoruesi u krijua por nuk u lexua nga databaza.');
      }

      return await this.issueSession(user, meta, 'auth.register');
    } catch (e) {
      if (e instanceof HttpException) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') throw new ConflictException('Ky email është i regjistruar');
        throw new BadRequestException(
          `Databaza nuk përputhet me kodin (Prisma ${e.code}). Në backend ekzekuto: npx prisma db push`,
        );
      }
      if (e instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Të dhëna të pavlefshme për databazën.');
      }
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`register i papritur: ${msg}`, e instanceof Error ? e.stack : undefined);
      throw new BadRequestException(
        `Regjistrimi dështoi: ${msg}. Kontrollo që PostgreSQL është ngritur dhe ke bërë db push + seed.`,
      );
    }
  }

  async login(email: string, password: string, meta: ClientMeta) {
    const user = await this.authRepo.findUserByEmail(email);

    if (!user) throw new UnauthorizedException('Kredenciale te pasakta');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Kredenciale te pasakta');

    return this.issueSession(user, meta, 'auth.login');
  }

  async changePassword(email: string, currentPassword: string, newPassword: string, meta: ClientMeta) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.authRepo.findUserByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedException('Kredenciale te pasakta');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Fjalëkalimi aktual nuk është i saktë');

    const nextHash = await bcrypt.hash(newPassword, 12);
    await this.authRepo.updateUserPassword(user.id, nextHash);
    await this.authRepo.createAuditLog({
      userId: user.id,
      action: 'auth.change_password',
      entity: 'User',
      entityId: user.id,
      oldValue: { passwordChanged: false },
      newValue: { passwordChanged: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return { success: true };
  }

  async loginWithGoogle(email: string, fullName: string, meta: ClientMeta) {
    const normalizedEmail = email.trim().toLowerCase();
    let user = await this.authRepo.findUserByEmail(normalizedEmail);

    if (!user) {
      const userRole = await this.authRepo.findRoleByName('USER');
      if (!userRole) {
        throw new BadRequestException(
          'Roli USER mungon në databazë. Në folderin backend ekzekuto: npm run seed',
        );
      }
      const randomPassword = randomBytes(24).toString('base64url');
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      const trimmedName = fullName.trim() || normalizedEmail;
      const spaceIdx = trimmedName.indexOf(' ');
      const firstName = spaceIdx > -1 ? trimmedName.slice(0, spaceIdx) : trimmedName;
      const lastName  = spaceIdx > -1 ? trimmedName.slice(spaceIdx + 1).trim() : '';
      const created = await this.authRepo.createUserWithRole({
        email: normalizedEmail,
        firstName,
        lastName,
        fullName: trimmedName,
        passwordHash,
        role: userRole,
      });
      user = await this.authRepo.findUserByIdWithRoles(created.id);
    }

    if (!user) {
      throw new BadRequestException('Nuk u arrit hyrja me Google.');
    }

    return this.issueSession(user, meta, 'auth.google_login');
  }

  private async issueSession(user: UserWithRoles, meta: ClientMeta, auditAction: string) {
    const permissions = new Set<string>();
    const roles: string[] = [];
    for (const ur of user.roles ?? []) {
      if (!ur?.role?.name) continue;
      roles.push(ur.role.name);
      for (const rp of ur.role.permissions ?? []) {
        if (rp?.permission?.key) permissions.add(rp.permission.key);
      }
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      perms: Array.from(permissions),
    });

    const refreshTokenPlain = randomBytes(48).toString('base64url');
    const refreshTokenHash = this.hashToken(refreshTokenPlain);
    const refreshTtlSeconds = Number(this.config.get<string>('JWT_REFRESH_TTL_SECONDS') ?? 604800);
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

    await this.authRepo.createRefreshToken(user.id, refreshTokenHash, expiresAt);

    await this.authRepo.createAuditLog({
      userId: user.id,
      action: auditAction,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: { id: user.id, email: user.email, fullName: user.fullName, firstName: user.firstName ?? null, lastName: user.lastName ?? null },
      roles,
    };
  }

  async refresh(refreshTokenPlain: string) {
    const tokenHash = this.hashToken(refreshTokenPlain);
    const token = await this.authRepo.findActiveRefreshToken(tokenHash);
    if (!token) throw new UnauthorizedException('Refresh token i pavlefshem');
    if (token.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Refresh token i skaduar');

    const permissions = new Set<string>();
    for (const ur of token.user.roles ?? []) {
      if (!ur?.role) continue;
      for (const rp of ur.role.permissions ?? []) {
        if (rp?.permission?.key) permissions.add(rp.permission.key);
      }
    }

    const accessToken = await this.jwt.signAsync({
      sub: token.user.id,
      email: token.user.email,
      perms: Array.from(permissions),
    });

    return { accessToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
