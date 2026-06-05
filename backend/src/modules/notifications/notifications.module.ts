import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module';
import { SupportController } from './support.controller';
import { ContactController } from './contact.controller';

@Module({
  imports: [PrismaModule, AuthModule, JwtModule.register({})],
  controllers: [NotificationsController, SupportController, ContactController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}

