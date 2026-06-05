import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  sku!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  /** Çmimi në cent (p.sh. 1999 = 19.99 €) */
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsString()
  description?: string;

  /** Emri i kategorisë (connectOrCreate) */
  @IsOptional()
  @IsString()
  @MinLength(2)
  categoryName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  /** URL e plotë e fotos (p.sh. nga /shop-assets/...) */
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
