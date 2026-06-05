import { Type } from 'class-transformer';
import { IsArray, IsString, MinLength, ValidateNested } from 'class-validator';

export class CategoryImportRow {
  @IsString()
  @MinLength(2)
  name!: string;
}

export class ImportCategoriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryImportRow)
  items!: CategoryImportRow[];
}
