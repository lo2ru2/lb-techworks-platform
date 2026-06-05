import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(where?: Prisma.OrderWhereInput) {
    return this.prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payments: true,
        statusHistory: true,
        customer: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  findById(id: string) {
    return this.prisma.order.findUnique({ where: { id } });
  }

  updateStatus(orderId: string, status: OrderStatus, updatedById?: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status, ...(updatedById ? { updatedById } : {}) },
      include: { customer: true, items: { include: { product: true } } },
    });
  }

  createStatusHistory(orderId: string, status: OrderStatus, note: string) {
    return this.prisma.orderStatusHistory.create({
      data: { orderId, status, note },
    });
  }

  findWithPayment(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, customer: true, items: { include: { product: true } } },
    });
  }

  updatePayment(paymentId: string, data: Prisma.PaymentUpdateInput) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data,
    });
  }

  findPaymentByExternalRef(externalRef: string) {
    return this.prisma.payment.findFirst({
      where: { externalRef },
    });
  }

  findPaymentById(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  listForCsv(where?: Prisma.OrderWhereInput) {
    return this.prisma.order.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
  }

  checkoutTransaction<T>(cb: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction((tx) => cb(tx));
  }

  listByCustomerEmail(email: string) {
    return this.prisma.order.findMany({
      where: { customer: { email } },
      include: {
        items: { include: { product: true } },
        customer: true,
        address: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  markSeenByAdmin(orderId: string, seenBy?: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { isSeen: true, seenAt: new Date(), ...(seenBy ? { seenBy } : {}) },
    });
  }

  countUnseenOrders() {
    return this.prisma.order.count({ where: { isSeen: false } });
  }
}
