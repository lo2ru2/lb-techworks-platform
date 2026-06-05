import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertCustomerByEmail(email: string, fullName: string, phone?: string | null) {
    return this.prisma.customer.upsert({
      where: { email },
      update: { fullName, phone: phone ?? null },
      create: { email, fullName, phone: phone ?? null },
    });
  }

  async getOrCreateCart(customerId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { customerId } });
  }

  async clearCart(cartId: string) {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
  }

  async setItems(cartId: string, items: { productId: string; quantity: number }[]) {
    await this.clearCart(cartId);
    if (items.length === 0) return;
    await this.prisma.cartItem.createMany({
      data: items.map((item) => ({ cartId, productId: item.productId, quantity: item.quantity })),
    });
  }

  async getCartItems(cartId: string) {
    return this.prisma.cartItem.findMany({
      where: { cartId },
      include: { product: { include: { images: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
