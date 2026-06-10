import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

const CORS_ORIGIN = process.env.BACKEND_CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? ['http://localhost:5173'];

type JwtPayload = { sub: string; email: string; perms: string[] };

type SupportMessage = {
  id: string;
  sessionId: string;
  from: 'customer' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  messageType: string;
  isReplied: boolean;
};

type SupportSession = {
  sessionId: string;
  customerUserId?: string;
  customerEmail?: string;
  customerName: string;
  updatedAt: string;
  messages: SupportMessage[];
};

@WebSocketGateway({
  cors: { origin: CORS_ORIGIN, credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private verifyToken(token: string | undefined): JwtPayload | null {
    if (!token) return null;
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
      });
    } catch {
      return null;
    }
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach((room) => client.leave(room));
  }

  @WebSocketServer()
  server!: Server;

  async handleConnection(client: Socket) {
    const userId = (client.handshake.query.userId as string | undefined)?.trim();
    if (userId) client.join(`user:${userId}`);

    // Validate role via JWT token if provided (security: don't trust query.role alone)
    const token  = (client.handshake.query.token as string | undefined)?.trim()
                || (client.handshake.auth as Record<string, string> | undefined)?.token?.trim();
    const jwtPayload = this.verifyToken(token);

    const roleQuery = (client.handshake.query.role as string | undefined)?.trim();
    // Admin role requires valid JWT with orders.read permission
    const isAdminByJwt = jwtPayload?.perms?.includes('orders.read') === true;
    const role = (isAdminByJwt && roleQuery === 'admin') ? 'admin' : roleQuery !== 'admin' ? roleQuery : null;

    if (role === 'admin') {
      client.join('support:admins');
      client.emit('support:sessions', await this.getSupportSessionsSnapshot());
      client.emit('notifications:counts', await this.getNotificationCounts());
    } else if (role === 'customer') {
      const sessionId = (client.handshake.query.sessionId as string | undefined)?.trim();
      const userIdRaw = (client.handshake.query.userId as string | undefined)?.trim();
      const emailRaw = (client.handshake.query.email as string | undefined)?.trim();
      const nameRaw = (client.handshake.query.name as string | undefined)?.trim();
      if (sessionId) {
        await this.prisma.supportSession.upsert({
          where: { id: sessionId },
          update: {
            ...(userIdRaw ? { customerUserId: userIdRaw } : {}),
            ...(emailRaw ? { customerEmail: emailRaw.toLowerCase() } : {}),
            ...(nameRaw ? { customerName: nameRaw } : {}),
          },
          create: {
            id: sessionId,
            customerUserId: userIdRaw || null,
            customerEmail: emailRaw ? emailRaw.toLowerCase() : null,
            customerName: nameRaw || 'Klient',
          },
        });
        client.join(`support:session:${sessionId}`);
        const messages = await this.prisma.supportMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 200,
        });
        client.emit(
          'support:history',
          messages.map((m) => ({
            id: m.id,
            sessionId: m.sessionId,
            from: m.from as 'customer' | 'admin',
            senderName: m.senderName,
            text: m.text,
            createdAt: m.createdAt.toISOString(),
            isRead: m.isRead,
            messageType: m.messageType,
            isReplied: m.isReplied,
          })),
        );
      }
    }

    client.on('support:customer:message', async (payload: unknown) => {
      const data = payload as {
        sessionId?: string;
        userId?: string;
        email?: string;
        name?: string;
        text?: string;
      } | null;
      const sessionId = data?.sessionId?.trim();
      const userId = data?.userId?.trim();
      const email = data?.email?.trim();
      const text = data?.text?.trim();
      const name = data?.name?.trim() || 'Klient';
      if (!sessionId || !text) return;

      await this.prisma.supportSession.upsert({
        where: { id: sessionId },
        update: {
          customerName: name,
          ...(userId ? { customerUserId: userId } : {}),
          ...(email ? { customerEmail: email.toLowerCase() } : {}),
        },
        create: {
          id: sessionId,
          customerName: name,
          customerUserId: userId || null,
          customerEmail: email ? email.toLowerCase() : null,
        },
      });

      const saved = await this.prisma.supportMessage.create({
        data: {
          sessionId,
          from: 'customer',
          senderName: name,
          text,
          messageType: 'normal',
          isRead: false,
          status: 'unread',
        },
      });

      const msg: SupportMessage = {
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

      this.server.to(`support:session:${sessionId}`).emit('support:message', msg);
      this.server.to('support:admins').emit('support:message', msg);

      const alreadyAuto = await this.prisma.supportMessage.count({
        where: { sessionId, messageType: 'automated_response' },
      });
      if (alreadyAuto === 0) {
        const bot = await this.prisma.supportMessage.create({
          data: {
            sessionId,
            from: 'admin',
            senderName: 'LB Techworks Bot',
            text: "Përshëndetje! 👋 Faleminderit që na kontaktuat. Njëri nga agjentet tanë do t'ju përgjigjet sa më shpejt. Faleminderit që zgjodhët LB Techworks! 🙏",
            messageType: 'automated_response',
            isRead: true,
            readAt: new Date(),
            status: 'read',
          },
        });
        const botMsg: SupportMessage = {
          id: bot.id,
          sessionId: bot.sessionId,
          from: 'admin',
          senderName: bot.senderName,
          text: bot.text,
          createdAt: bot.createdAt.toISOString(),
          isRead: bot.isRead,
          messageType: bot.messageType,
          isReplied: bot.isReplied,
        };
        this.server.to(`support:session:${sessionId}`).emit('support:message', botMsg);
        this.server.to('support:admins').emit('support:message', botMsg);
      }
      this.server.to('support:admins').emit('support:sessions', await this.getSupportSessionsSnapshot());
      this.server.to('support:admins').emit('notifications:counts', await this.getNotificationCounts());
    });

    client.on('support:admin:message', async (payload: unknown) => {
      const data = payload as { sessionId?: string; adminName?: string; text?: string } | null;
      const sessionId = data?.sessionId?.trim();
      const text = data?.text?.trim();
      const adminName = data?.adminName?.trim() || 'Admin';
      if (!sessionId || !text) return;

      await this.prisma.supportSession.upsert({
        where: { id: sessionId },
        update: {},
        create: { id: sessionId, customerName: 'Klient', customerEmail: null, customerUserId: null },
      });

      const saved = await this.prisma.supportMessage.create({
        data: {
          sessionId,
          from: 'admin',
          senderName: adminName,
          text,
          isRead: true,
          readAt: new Date(),
          status: 'read',
        },
      });

      await this.prisma.supportMessage.updateMany({
        where: { sessionId, from: 'customer', isRead: false },
        data: { isRead: true, readAt: new Date(), readBy: adminName, isReplied: true, repliedAt: new Date(), status: 'replied' },
      });

      const msg: SupportMessage = {
        id: saved.id,
        sessionId: saved.sessionId,
        from: 'admin',
        senderName: saved.senderName,
        text: saved.text,
        createdAt: saved.createdAt.toISOString(),
        isRead: saved.isRead,
        messageType: saved.messageType,
        isReplied: saved.isReplied,
      };

      this.server.to(`support:session:${sessionId}`).emit('support:message', msg);
      this.server.to('support:admins').emit('support:message', msg);
      this.server.to('support:admins').emit('support:sessions', await this.getSupportSessionsSnapshot());
      this.server.to('support:admins').emit('notifications:counts', await this.getNotificationCounts());
    });
  }

  notifyUser(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  async supportSessionsSnapshot() {
    return this.getSupportSessionsSnapshot();
  }

  async notificationCountsSnapshot() {
    return this.getNotificationCounts();
  }

  async emitAdminCounts() {
    this.server.to('support:admins').emit('notifications:counts', await this.getNotificationCounts());
  }

   private async getSupportSessionsSnapshot(): Promise<SupportSession[]> {
    const sessions = await this.prisma.supportSession.findMany({
      where: { id: { not: { startsWith: 'contact:' } } },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    return sessions.map((s) => ({
      sessionId: s.id,
      customerUserId: s.customerUserId ?? undefined,
      customerEmail: s.customerEmail ?? undefined,
      customerName: s.customerName,
      updatedAt: s.updatedAt.toISOString(),
      messages: s.messages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        from: m.from as 'customer' | 'admin',
        senderName: m.senderName,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        isRead: m.isRead,
        messageType: m.messageType,
        isReplied: m.isReplied,
      })),
    }));
  }

  private async getNotificationCounts() {
    const [supportUnread, contactUnread, ordersUnread] = await Promise.all([
      this.prisma.supportMessage.count({
        where: {
          from: 'customer',
          isRead: false,
          session: { id: { not: { startsWith: 'contact:' } } },
        },
      }),
      this.prisma.supportMessage.count({
        where: {
          from: 'customer',
          isRead: false,
          session: { id: { startsWith: 'contact:' } },
        },
      }),
      this.prisma.order.count({ where: { isSeen: false } }),
    ]);
    return { supportUnread, contactUnread, ordersUnread };
  }
}

