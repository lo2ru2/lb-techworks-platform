import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { NotificationsService } from './notifications.service';

type AuthedRequest = Request & { user: { userId: string } };

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  async createContact(@Body() body: { name: string; email: string; subject: string; message: string }) {
    return this.notifications.createContactMessage(body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Get()
  async listContact() {
    return this.notifications.listContactMessages();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notifications.markContactRead(id, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Patch('read-all')
  async readAll(@Req() req: AuthedRequest) {
    return this.notifications.markAllContactRead(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('orders.read')
  @Delete('read')
  async deleteRead() {
    return this.notifications.deleteReadContact();
  }
}
