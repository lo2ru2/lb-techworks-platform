import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { CartsRepository } from './carts.repository';

@Module({
  imports: [AuthModule],
  controllers: [CartsController],
  providers: [CartsService, CartsRepository],
})
export class CartsModule {}
