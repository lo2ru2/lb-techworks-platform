import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  parseExportFormat,
  rowsToCsv,
  rowsToJson,
  rowsToXlsxBuffer,
  type ExportFormat,
} from '../../common/export/export-formats';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async me(userId: string) {
    return this.usersRepo.me(userId);
  }

  async listAdmin(q?: string) {
    return this.usersRepo.listAdmin({ q });
  }

  async updateMe(userId: string, payload: { firstName?: string; lastName?: string; fullName?: string; phone?: string | null; email?: string }) {
    return this.usersRepo.updateMe(userId, payload);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.usersRepo.findByIdWithPassword(userId);
    if (!user) throw new BadRequestException('Përdoruesi nuk u gjet');
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Fjalëkalimi aktual është gabim');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.usersRepo.updatePassword(userId, hash);
    return { ok: true };
  }

  private encodeExport(format: ExportFormat, rows: Record<string, unknown>[], base: string) {
    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: `${base}.json`,
        body: rowsToJson(rows),
      };
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${base}.xlsx`,
        body: rowsToXlsxBuffer(rows, base),
      };
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: `${base}.csv`,
      body: rowsToCsv(rows),
    };
  }

  async exportAdmin(formatRaw: string | undefined, q?: string) {
    const format = parseExportFormat(formatRaw);
    const users = await this.listAdmin(q);
    const rows = users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      fullName: u.fullName,
      phone: u.phone ?? '',
      isActive: u.isActive,
      status: u.status,
      roles: u.roles.map((r) => r.role.name).join(';'),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })) as Record<string, unknown>[];
    return this.encodeExport(format, rows, 'users');
  }
}

