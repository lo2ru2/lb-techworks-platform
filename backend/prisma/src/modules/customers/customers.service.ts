import { Injectable } from '@nestjs/common';
import {
  parseExportFormat,
  rowsToCsv,
  rowsToJson,
  rowsToXlsxBuffer,
  type ExportFormat,
} from '../../common/export/export-formats';
import { CustomersRepository } from './customers.repository';
import { ImportCustomersDto } from './dto/import-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}

  async list(q?: string) {
    return this.repo.list({ q });
  }

  private encodeExport(format: ExportFormat, rows: Record<string, unknown>[]) {
    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: 'customers.json',
        body: rowsToJson(rows),
      };
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'customers.xlsx',
        body: rowsToXlsxBuffer(rows, 'customers'),
      };
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: 'customers.csv',
      body: rowsToCsv(rows),
    };
  }

  async export(formatRaw: string | undefined, q?: string) {
    const format = parseExportFormat(formatRaw);
    const list = await this.list(q);
    const rows = list.map((c) => ({
      id: c.id,
      email: c.email,
      fullName: c.fullName,
      phone: c.phone ?? '',
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })) as Record<string, unknown>[];
    return this.encodeExport(format, rows);
  }

  async importMany(dto: ImportCustomersDto, actorUserId: string) {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < dto.items.length; i++) {
      const row = dto.items[i];
      try {
        await this.repo.upsertFromImport(row.email, row.fullName, row.phone ?? null, actorUserId);
        imported += 1;
      } catch (e) {
        errors.push(`Rreshti ${i + 1}: ${e instanceof Error ? e.message : 'gabim'}`);
      }
    }
    return { imported, errors };
  }
}
