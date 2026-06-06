import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
/** CJS `require` — shmang `stripe_1.default is not a constructor` me `nest start --watch`. */
import Stripe = require('stripe');
import { RedisService } from '../../common/cache/redis.service';
import {
  parseExportFormat,
  rowsToCsv,
  rowsToJson,
  rowsToXlsxBuffer,
  type ExportFormat,
} from '../../common/export/export-formats';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CheckoutDto } from './dto/checkout.dto';
import { OrdersRepository } from './orders.repository';

export type OrdersListFilters = {
  q?: string;
  status?: string;
  customerEmail?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);
  private readonly stripe: InstanceType<typeof Stripe> | null;
  private readonly frontendBaseUrl: string;

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly notifications: NotificationsGateway,
    private readonly cache: RedisService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('STRIPE_SECRET_KEY')?.trim();
    this.stripe = secret ? new Stripe(secret, { apiVersion: '2026-05-27.dahlia' }) : null;
    this.frontendBaseUrl = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  }

  private buildOrderWhere(f: OrdersListFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    const statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    if (f.status && statuses.includes(f.status as OrderStatus)) {
      where.status = f.status as OrderStatus;
    }
    if (f.customerEmail?.trim()) {
      where.customer = { email: { contains: f.customerEmail.trim(), mode: 'insensitive' } };
    }
    if (f.from || f.to) {
      where.createdAt = {};
      if (f.from) {
        const d = new Date(f.from);
        if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
      }
      if (f.to) {
        const d = new Date(f.to);
        if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
      }
    }
    if (f.q?.trim()) {
      const t = f.q.trim();
      where.OR = [
        { customer: { email: { contains: t, mode: 'insensitive' } } },
        { customer: { fullName: { contains: t, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  async list(filters: OrdersListFilters = {}) {
    const where = this.buildOrderWhere(filters);
    const cacheKey = `orders:list:${JSON.stringify(filters)}`;
    const cached = await this.cache.getJson<unknown[]>(cacheKey);
    if (cached) return cached;
    const rows = await this.ordersRepo.list(where);
    await this.cache.setJson(cacheKey, rows, 20);
    return rows;
  }

  async checkout(dto: CheckoutDto) {
    const productIds = [...new Set(dto.items.map((i) => i.productId))];

    const result = await this.ordersRepo.checkoutTransaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: { inventory: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Një ose më shumë produkte nuk u gjetën ose nuk janë aktivë.');
      }

      for (const line of dto.items) {
        const p = products.find((x) => x.id === line.productId);
        if (!p) throw new BadRequestException(`Produkt i pavlefshëm: ${line.productId}`);
        const stock = p.inventory?.quantity ?? 0;
        if (stock < line.quantity) {
          throw new BadRequestException(`Stok i pamjaftueshëm për: ${p.name}`);
        }
      }

      const customer = await tx.customer.upsert({
        where: { email: dto.email.toLowerCase().trim() },
        update: { fullName: dto.fullName.trim(), phone: dto.phone.trim() },
        create: {
          email: dto.email.toLowerCase().trim(),
          fullName: dto.fullName.trim(),
          phone: dto.phone.trim(),
        },
      });

      const address = await tx.address.create({
        data: {
          customerId: customer.id,
          line1: dto.addressLine.trim(),
          line2: null,
          city: 'Pejë',
          postalCode: '30000',
          country: 'XK',
        },
      });

      const shipping = await tx.shippingMethod.findUnique({ where: { name: 'Standard' } });
      if (!shipping) throw new BadRequestException('Metoda e dërgesës Standard nuk ekziston (seed).');

      let subtotalCents = 0;
      const lineCreates = dto.items.map((line) => {
        const p = products.find((x) => x.id === line.productId)!;
        subtotalCents += p.priceCents * line.quantity;
        return {
          productId: p.id,
          quantity: line.quantity,
          unitPriceCents: p.priceCents,
        };
      });

      const shippingCents = 500;
      const totalCents = subtotalCents + shippingCents;

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          addressId: address.id,
          shippingMethodId: shipping.id,
          status: OrderStatus.PENDING,
          subtotalCents,
          shippingCents,
          discountCents: 0,
          totalCents,
          items: { create: lineCreates },
        },
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: dto.paymentMethod === 'card' ? 'stripe' : 'local',
          status: dto.paymentMethod === 'cash' ? 'completed' : 'requires_payment_method',
          amountCents: totalCents,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatus.PENDING,
          note: 'Porosi e re nga checkout',
        },
      });

      for (const line of dto.items) {
        await tx.inventory.update({
          where: { productId: line.productId },
          data: { quantity: { decrement: line.quantity } },
        });
      }

      const full = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { product: true } }, customer: true, payments: true },
      });

      this.notifications.server.emit('notification', {
        title: 'Porosi e re',
        body: `Porosia ${order.id.slice(0, 8)}… — ${(totalCents / 100).toFixed(2)} €`,
      });
      await this.notifications.emitAdminCounts();

      return {
        orderId: order.id,
        paymentId: payment.id,
        paymentMethod: dto.paymentMethod,
        totalCents,
        order: full,
      };
    });
    let stripeCheckoutUrl: string | undefined;
    if (result.paymentMethod === 'card') {
      if (!this.stripe) {
        throw new BadRequestException('Stripe nuk është i konfiguruar në server (STRIPE_SECRET_KEY).');
      }
      const order = result.order;
      if (!order?.items?.length) {
        throw new BadRequestException('Porosia pa artikuj.');
      }
      const lineItems = order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: item.unitPriceCents,
          product_data: { name: item.product.name },
        },
      }));
      if (order.shippingCents > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: order.shippingCents,
            product_data: { name: 'Dërgesa Standard' },
          },
        });
      }
      const session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lineItems,
        success_url: `${this.frontendBaseUrl}/payment/success?orderId=${encodeURIComponent(result.orderId)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.frontendBaseUrl}/detajet`,
        customer_email: dto.email.trim(),
        client_reference_id: result.orderId,
        metadata: {
          orderId: result.orderId,
          paymentId: result.paymentId,
        },
        payment_intent_data: {
          metadata: {
            orderId: result.orderId,
            paymentId: result.paymentId,
          },
        },
      });
      await this.ordersRepo.updatePayment(result.paymentId, {
        externalRef: session.id,
        status: 'open',
      });
      stripeCheckoutUrl = session.url ?? undefined;
      if (!stripeCheckoutUrl) {
        throw new BadRequestException('Stripe nuk ktheu URL për Checkout.');
      }
      this.log.log(`Stripe Checkout session order=${result.orderId} session=${session.id}`);
    }
    await this.invalidateOrdersCache();
    await this.cache.delByPrefix('products:list:');
    await this.cache.delByPrefix('products:admin:list');
    return {
      ...result,
      stripeCheckoutUrl,
    };
  }

  async createStripePaymentIntent(orderId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe nuk është i konfiguruar në server.');
    }
    const order = await this.ordersRepo.findWithPayment(orderId);
    if (!order) throw new NotFoundException('Porosia nuk u gjet.');
    const payment = order.payments.find((p) => p.provider === 'stripe') ?? order.payments[0];
    if (!payment) throw new BadRequestException('Pagesa për këtë porosi nuk u gjet.');
    if (payment.provider !== 'stripe') {
      throw new BadRequestException('Kjo porosi nuk është me pagesë kartë/Stripe.');
    }
    if (payment.externalRef?.startsWith('cs_')) {
      const session = await this.stripe.checkout.sessions.retrieve(payment.externalRef);
      if (session.url && session.status === 'open') {
        return { stripeCheckoutUrl: session.url };
      }
      throw new BadRequestException(
        'Sesioni i Stripe Checkout ka skaduar ose është mbyllur. Bëj një porosi të re për të paguar.',
      );
    }
    if (payment.externalRef) {
      const existing = await this.stripe.paymentIntents.retrieve(payment.externalRef);
      if (existing.client_secret) {
        return { clientSecret: existing.client_secret, paymentIntentId: existing.id };
      }
    }
    const intent = await this.stripe.paymentIntents.create({
      amount: payment.amountCents,
      currency: 'eur',
      payment_method_types: ['card'],
      metadata: { orderId: order.id, paymentId: payment.id },
    });
    await this.ordersRepo.updatePayment(payment.id, {
      externalRef: intent.id,
      status: intent.status,
    });
    this.log.log(`Stripe intent created via endpoint order=${order.id} intent=${intent.id}`);
    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  /**
   * Pas Stripe Checkout / PaymentIntent: përditëson pagesën dhe statusin e porosisë (webhook-i është ideal).
   */
  async syncCheckoutStripePayment(orderId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe nuk është aktiv.');
    }
    const orderRow = await this.ordersRepo.findWithPayment(orderId);
    if (!orderRow) throw new NotFoundException('Porosia nuk u gjet.');
    const payment = orderRow.payments.find((p) => p.provider === 'stripe');
    if (!payment?.externalRef) {
      throw new BadRequestException('Kjo porosi nuk ka regjistrim Stripe.');
    }

    let paid = false;
    let detailStatus: string;

    if (payment.externalRef.startsWith('cs_')) {
      const session = await this.stripe.checkout.sessions.retrieve(payment.externalRef);
      detailStatus = session.payment_status ?? session.status;
      paid = session.payment_status === 'paid';
      const pi = session.payment_intent;
      const piId = typeof pi === 'string' ? pi : pi && typeof pi === 'object' && 'id' in pi ? (pi as { id: string }).id : undefined;
      if (paid) {
        await this.ordersRepo.updatePayment(payment.id, {
          status: 'succeeded',
          ...(piId ? { externalRef: piId } : {}),
        });
      }
    } else {
      const intent = await this.stripe.paymentIntents.retrieve(payment.externalRef);
      detailStatus = intent.status;
      paid = intent.status === 'succeeded';
      if (paid) {
        await this.ordersRepo.updatePayment(payment.id, { status: intent.status });
      }
    }

    const nextOrderStatus = paid ? OrderStatus.PAID : OrderStatus.PENDING;
    if (paid && orderRow.status !== OrderStatus.PAID) {
      await this.ordersRepo.updateStatus(orderRow.id, nextOrderStatus);
      await this.ordersRepo.createStatusHistory(
        orderRow.id,
        nextOrderStatus,
        payment.externalRef.startsWith('cs_')
          ? 'Stripe Checkout: pagesa u verifikua'
          : 'Stripe: pagesa u verifikua pas checkout',
      );
    }
    await this.invalidateOrdersCache();
    return { paymentIntentStatus: detailStatus, orderStatus: nextOrderStatus };
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    if (!this.stripe) throw new BadRequestException('Stripe nuk është aktiv.');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) throw new BadRequestException('STRIPE_WEBHOOK_SECRET mungon.');
    if (!signature) throw new BadRequestException('Stripe signature mungon.');

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        payment_status?: string | null;
        metadata?: { paymentId?: string } | null;
        payment_intent?: string | { id?: string } | null;
      };
      let payment = await this.ordersRepo.findPaymentByExternalRef(session.id);
      if (!payment && session.metadata?.paymentId) {
        payment = await this.ordersRepo.findPaymentById(session.metadata.paymentId);
      }
      if (!payment) {
        this.log.warn(`checkout.session.completed: pa payment session=${session.id}`);
        return { received: true };
      }
      const paid = session.payment_status === 'paid';
      const piRef = session.payment_intent;
      const piId =
        typeof piRef === 'string'
          ? piRef
          : piRef && typeof piRef === 'object' && 'id' in piRef
            ? (piRef as { id: string }).id
            : undefined;
      if (paid) {
        await this.ordersRepo.updatePayment(payment.id, {
          status: 'succeeded',
          ...(piId ? { externalRef: piId } : {}),
        });
        const ord = await this.ordersRepo.findById(payment.orderId);
        if (ord && ord.status !== OrderStatus.PAID) {
          await this.ordersRepo.updateStatus(payment.orderId, OrderStatus.PAID);
          await this.ordersRepo.createStatusHistory(
            payment.orderId,
            OrderStatus.PAID,
            'Stripe Checkout: pagesa u konfirmua',
          );
        }
        this.log.log(`Stripe webhook checkout.session.completed order=${payment.orderId} session=${session.id}`);
        await this.invalidateOrdersCache();
      }
      return { received: true };
    }

    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as { id: string; status: string; metadata?: { paymentId?: string } };
      let payment = await this.ordersRepo.findPaymentByExternalRef(intent.id);
      if (!payment && intent.metadata?.paymentId) {
        payment = await this.ordersRepo.findPaymentById(intent.metadata.paymentId);
      }
      if (!payment) {
        this.log.warn(`Stripe event pa payment local: intent=${intent.id}`);
        return { received: true };
      }
      await this.ordersRepo.updatePayment(payment.id, { status: intent.status, externalRef: intent.id });
      const nextOrderStatus = intent.status === 'succeeded' ? OrderStatus.PAID : OrderStatus.PENDING;
      const ord = await this.ordersRepo.findById(payment.orderId);
      const skipFailedDowngrade = intent.status !== 'succeeded' && ord?.status === OrderStatus.PAID;
      if (ord && ord.status !== nextOrderStatus && !skipFailedDowngrade) {
        await this.ordersRepo.updateStatus(payment.orderId, nextOrderStatus);
        await this.ordersRepo.createStatusHistory(
          payment.orderId,
          nextOrderStatus,
          intent.status === 'succeeded' ? 'Stripe: pagesa u konfirmua' : 'Stripe: pagesa dështoi',
        );
      }
      this.log.log(`Stripe webhook ${event.type} order=${payment.orderId} intent=${intent.id} status=${intent.status}`);
      await this.invalidateOrdersCache();
    }
    return { received: true };
  }

  async updateStatus(orderId: string, status: OrderStatus, actorUserId?: string) {
    const exists = await this.ordersRepo.findById(orderId);
    if (!exists) throw new NotFoundException('Porosia nuk u gjet');

    const order = await this.ordersRepo.updateStatus(orderId, status, actorUserId);

    await this.ordersRepo.createStatusHistory(orderId, status, 'Përditësuar nga admin');

    this.notifications.server.emit('notification', {
      title: 'Status porosie',
      body: `Porosia ${orderId.slice(0, 8)}… tani: ${status}`,
    });

    await this.invalidateOrdersCache();
    return order;
  }

  private encodeOrderExport(format: ExportFormat, rows: Record<string, unknown>[]) {
    if (format === 'json') {
      return {
        contentType: 'application/json; charset=utf-8',
        filename: 'orders.json',
        body: rowsToJson(rows),
      };
    }
    if (format === 'xlsx') {
      return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'orders.xlsx',
        body: rowsToXlsxBuffer(rows, 'orders'),
      };
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      filename: 'orders.csv',
      body: rowsToCsv(rows),
    };
  }

  async exportOrders(formatRaw: string | undefined, filters: OrdersListFilters) {
    const format = parseExportFormat(formatRaw);
    const where = this.buildOrderWhere(filters);
    const orders = await this.ordersRepo.listForCsv(where);
    const rows = orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      customerEmail: o.customer.email,
      customerName: o.customer.fullName,
      subtotalCents: o.subtotalCents,
      shippingCents: o.shippingCents,
      discountCents: o.discountCents,
      totalCents: o.totalCents,
    })) as Record<string, unknown>[];
    return this.encodeOrderExport(format, rows);
  }

  async exportCsv() {
    const pack = await this.exportOrders('csv', {});
    return typeof pack.body === 'string' ? pack.body : pack.body.toString('utf8');
  }

  async importStatusRows(
    rows: { id: string; status: OrderStatus }[],
    actorUserId: string,
  ): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];
    const statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!statuses.includes(r.status)) {
          errors.push(`Rreshti ${i + 1}: status i pavlefshëm`);
          continue;
        }
        const exists = await this.ordersRepo.findById(r.id);
        if (!exists) {
          errors.push(`Rreshti ${i + 1}: porosia nuk u gjet`);
          continue;
        }
        await this.ordersRepo.updateStatus(r.id, r.status, actorUserId);
        await this.ordersRepo.createStatusHistory(r.id, r.status, 'Import / përditësim masiv');
        updated += 1;
      } catch (e) {
        errors.push(`Rreshti ${i + 1}: ${e instanceof Error ? e.message : 'gabim'}`);
      }
    }
    await this.invalidateOrdersCache();
    if (updated > 0) {
      this.notifications.server.emit('notification', {
        title: 'Import porosish',
        body: `${updated} rreshta u përditësuan`,
      });
    }
    return { updated, errors };
  }

  async markPaid(orderId: string, actorUserId?: string) {
    return this.updateStatus(orderId, OrderStatus.PAID, actorUserId);
  }

  async listForCustomer(email: string) {
    return this.ordersRepo.listByCustomerEmail(email.trim().toLowerCase());
  }

  async markSeen(orderId: string, actorUserId?: string) {
    const exists = await this.ordersRepo.findById(orderId);
    if (!exists) throw new NotFoundException('Porosia nuk u gjet');
    const updated = await this.ordersRepo.markSeenByAdmin(orderId, actorUserId);
    await this.notifications.emitAdminCounts();
    return updated;
  }

  async countUnseenOrders() {
    return this.ordersRepo.countUnseenOrders();
  }

  private async invalidateOrdersCache() {
    await this.cache.delByPrefix('orders:list');
    await this.cache.delByPrefix('reports:sales-summary:');
  }
}
