import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';

export class OrderStatusImportRow {
  @IsUUID()
  id!: string;

  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

export class ImportOrdersStatusDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderStatusImportRow)
  rows!: OrderStatusImportRow[];
}
