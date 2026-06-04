import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CartsService } from './carts.service';
import { UpsertCartDto } from './dto/upsert-cart.dto';

type AuthedRequest = Request & { user: { userId: string; email: string } };

@ApiTags('carts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('carts')
export class CartsController {
  constructor(private readonly carts: CartsService) {}

  @Get('me')
  async getMe(@Req() req: AuthedRequest) {
    return this.carts.getMyCart(req.user.userId, req.user.email);
  }

  @Put('me')
  async putMe(@Req() req: AuthedRequest, @Body() body: UpsertCartDto) {
    return this.carts.putMyCart(req.user.userId, req.user.email, body.items);
  }
}
