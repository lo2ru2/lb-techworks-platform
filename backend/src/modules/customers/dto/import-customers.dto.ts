import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

export class CustomerImportRow {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ImportCustomersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerImportRow)
  items!: CustomerImportRow[];
}
