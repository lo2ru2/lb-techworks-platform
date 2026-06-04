import { Injectable } from '@nestjs/common';
import { CartsRepository } from './carts.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartsService {
  constructor(
    private readonly cartsRepo: CartsRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveCustomer(userId: string, email: string) {
    // Try to find customer linked to this user's email
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, phone: true },
    });
    const resolvedEmail = user?.email ?? normalized;
    const resolvedName  = user?.fullName ?? normalized;
    const resolvedPhone = user?.phone ?? null;
    return this.cartsRepo.upsertCustomerByEmail(resolvedEmail, resolvedName, resolvedPhone);
  }

  async getMyCart(userId: string, email: string) {
    const customer = await this.resolveCustomer(userId, email);
    const cart     = await this.cartsRepo.getOrCreateCart(customer.id);
    const items    = await this.cartsRepo.getCartItems(cart.id);
    return {
      cartId: cart.id,
      items: items.map((item) => ({
        productId:     item.productId,
        productName:   item.product.name,
        unitPriceCents: item.product.priceCents,
        imageUrl:      item.product.images[0]?.url ?? '',
        quantity:      item.quantity,
      })),
    };
  }

  async putMyCart(userId: string, email: string, items: { productId: string; quantity: number }[]) {
    const customer = await this.resolveCustomer(userId, email);
    const cart     = await this.cartsRepo.getOrCreateCart(customer.id);
    await this.cartsRepo.setItems(cart.id, items);
    return this.getMyCart(userId, email);
  }
}
