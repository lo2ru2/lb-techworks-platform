import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { OrdersService, type OrdersListFilters } from './orders.service';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { ImportOrdersStatusDto } from './dto/import-orders-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type AuthedRequest = Request & { user: { userId: string } };

function orderFiltersFromQuery(q: {
  q?: string;
  status?: string;
  customerEmail?: string;
  from?: string;
  to?: string;
}): OrdersListFilters {
  return {
    q: q.q,
    status: q.status,
    customerEmail: q.customerEmail,
    from: q.from,
    to: q.to,
  };
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /** Checkout publik (pa JWT) — krijon Customer, Address, Order, OrderItem, Payment */
  @Post('checkout')
  async checkout(@Body() dto: CheckoutDto) {
    return this.orders.checkout(dto);
  }

  @Post('checkout/:orderId/stripe-sync')
  async syncCheckoutStripe(@Param('orderId') orderId: string) {
    return this.orders.syncCheckoutStripePayment(orderId);
  }

  @Post(':id/stripe-payment-intent')
  async createStripePaymentIntent(@Param('id') id: string) {
    return this.orders.createStripePaymentIntent(id);
  }

  @Post('stripe/webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request & { body: Buffer },
  ) {
    return this.orders.handleStripeWebhook(signature, req.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get('export')
  async export(
    @Res({ passthrough: false }) res: Response,
    @Query('format') format?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('customerEmail') customerEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const pack = await this.orders.exportOrders(format, orderFiltersFromQuery({ q, status, customerEmail, from, to }));
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get('export.csv')
  async exportCsv(
    @Res({ passthrough: false }) res: Response,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('customerEmail') customerEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const pack = await this.orders.exportOrders('csv', orderFiltersFromQuery({ q, status, customerEmail, from, to }));
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.write')
  @Post('admin/import-status')
  async importStatus(@Body() body: ImportOrdersStatusDto, @Req() req: AuthedRequest) {
    return this.orders.importStatusRows(body.rows, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async listMine(@Req() req: Request & { user: { email: string } }) {
    return this.orders.listForCustomer(req.user.email);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get()
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('customerEmail') customerEmail?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.orders.list(orderFiltersFromQuery({ q, status, customerEmail, from, to }));
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.write')
  @Patch(':id/status')
  async updateStatus(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, body.status, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.write')
  @Patch(':id/seen')
  async markSeen(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.orders.markSeen(id, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get('unseen-count')
  async unseenCount() {
    const count = await this.orders.countUnseenOrders();
    return { count };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.write')
  @Post(':id/mark-paid')
  async markPaid(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.orders.markPaid(id, req.user.userId);
  }
}
