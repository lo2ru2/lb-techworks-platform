import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class CheckoutLineDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CheckoutDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(5)
  phone!: string;

  @IsString()
  @MinLength(8)
  addressLine!: string;

  @IsIn(['cash', 'card'])
  paymentMethod!: 'cash' | 'card';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];
}
