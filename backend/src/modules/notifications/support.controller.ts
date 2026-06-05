import { Controller, Delete, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { NotificationsService } from './notifications.service';

type AuthedRequest = Request & { user: { userId: string } };

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequiresPermissions('orders.read')
@Controller('support')
export class SupportController {
  constructor(private readonly notifications: NotificationsService) {}

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notifications.markSupportRead(id, req.user.userId);
  }

  @Patch('read-all')
  async readAll(@Req() req: AuthedRequest) {
    return this.notifications.markAllSupportRead(req.user.userId);
  }

  @Delete('read')
  async deleteRead() {
    return this.notifications.deleteReadSupport();
  }
}
