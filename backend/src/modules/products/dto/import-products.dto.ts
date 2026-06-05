import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class ImportProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  items!: CreateProductDto[];
}
