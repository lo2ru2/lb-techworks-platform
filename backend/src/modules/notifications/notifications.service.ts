import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createContactMessage(payload: { name: string; email: string; subject: string; message: string }) {
    const email = payload.email.trim().toLowerCase();
    const sessionId = `contact:${email}`;
    await this.prisma.supportSession.upsert({
      where: { id: sessionId },
      update: { customerName: payload.name.trim(), customerEmail: email },
      create: {
        id: sessionId,
        customerName: payload.name.trim(),
        customerEmail: email,
      },
    });
    const saved = await this.prisma.supportMessage.create({
      data: {
        sessionId,
        from: 'customer',
        senderName: payload.name.trim(),
        text: `[Contact] ${payload.subject.trim()}: ${payload.message.trim()}`,
        isRead: false,
        status: 'unread',
      },
    });
    const msg = {
      id: saved.id,
      sessionId: saved.sessionId,
      from: 'customer',
      senderName: saved.senderName,
      text: saved.text,
      createdAt: saved.createdAt.toISOString(),
      isRead: saved.isRead,
      messageType: saved.messageType,
      isReplied: saved.isReplied,
    };
    this.gateway.server.to('support:admins').emit('support:message', msg);
    this.gateway.server.to('support:admins').emit('support:sessions', await this.gateway.supportSessionsSnapshot());
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }

  async listContactMessages() {
    const sessions = await this.prisma.supportSession.findMany({
      where: { id: { startsWith: 'contact:' } },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 50 } },
      orderBy: { updatedAt: 'desc' },
    });
    return sessions.map((session) => {
      const latestCustomer = session.messages.find((m) => m.from === 'customer');
      const status = latestCustomer?.isReplied ? 'replied' : latestCustomer?.isRead ? 'read' : 'unread';
      return { ...session, status };
    });
  }

  async getUnreadCounts() {
    return this.gateway.notificationCountsSnapshot();
  }

  async markSupportRead(messageId: string, adminId: string) {
    await this.prisma.supportMessage.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date(), readBy: adminId, status: 'read' },
    });
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }

  async markContactRead(sessionId: string, adminId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { sessionId, from: 'customer' },
      data: { isRead: true, readAt: new Date(), readBy: adminId, status: 'read' },
    });
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }

  async markAllSupportRead(adminId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { from: 'customer', isRead: false, session: { id: { not: { startsWith: 'contact:' } } } },
      data: { isRead: true, readAt: new Date(), readBy: adminId, status: 'read' },
    });
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }

  async markAllContactRead(adminId: string) {
    await this.prisma.supportMessage.updateMany({
      where: { from: 'customer', isRead: false, session: { id: { startsWith: 'contact:' } } },
      data: { isRead: true, readAt: new Date(), readBy: adminId, status: 'read' },
    });
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }

  async deleteReadSupport() {
    await this.prisma.supportMessage.deleteMany({
      where: { isRead: true, session: { id: { not: { startsWith: 'contact:' } } } },
    });
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }

  async deleteReadContact() {
    await this.prisma.supportMessage.deleteMany({
      where: { isRead: true, session: { id: { startsWith: 'contact:' } } },
    });
    await this.gateway.emitAdminCounts();
    return { ok: true };
  }
}
