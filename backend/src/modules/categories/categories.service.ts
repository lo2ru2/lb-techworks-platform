import { Injectable } from '@nestjs/common';
import {
  parseExportFormat,
  rowsToCsv,
  rowsToJson,
  rowsToXlsxBuffer,
  type ExportFormat,
} from '../../common/export/export-formats';
import { CategoriesRepository } from './categories.repository';
import { ImportCategoriesDto } from './dto/import-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async list(q?: string) {
    return this.repo.list({ q });
  }

  private encodeExport(format: ExportFormat, rows: Record<string, unknown>[]) {
    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: 'categories.json',
        body: rowsToJson(rows),
      };
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'categories.xlsx',
        body: rowsToXlsxBuffer(rows, 'categories'),
      };
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: 'categories.csv',
      body: rowsToCsv(rows),
    };
  }

  async export(formatRaw: string | undefined, q?: string) {
    const format = parseExportFormat(formatRaw);
    const list = await this.list(q);
    const rows = list.map((c) => ({
      id: c.id,
      name: c.name,
      productCount: c._count.products,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })) as Record<string, unknown>[];
    return this.encodeExport(format, rows);
  }

  async importMany(dto: ImportCategoriesDto, actorUserId: string) {
    let imported = 0;
    const errors: string[] = [];
    for (let i = 0; i < dto.items.length; i++) {
      try {
        await this.repo.upsertByName(dto.items[i].name, actorUserId);
        imported += 1;
      } catch (e) {
        errors.push(`Rreshti ${i + 1}: ${e instanceof Error ? e.message : 'gabim'}`);
      }
    }
    return { imported, errors };
  }
}
