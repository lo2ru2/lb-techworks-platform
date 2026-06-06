import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

type AuthedRequest = Request & { user: { userId: string } };

class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class ChangePasswordDto {
  @IsString()
  oldPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('users.read')
  @Get('admin/export')
  async exportAdmin(
    @Res({ passthrough: false }) res: Response,
    @Query('format') format?: string,
    @Query('q') q?: string,
  ) {
    const pack = await this.users.exportAdmin(format, q);
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('users.read')
  @Get('admin/list')
  async listAdmin(@Query('q') q?: string) {
    return this.users.listAdmin(q);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('users.read')
  @Get('me')
  async me(@Req() req: AuthedRequest) {
    return this.users.me(req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(@Req() req: AuthedRequest, @Body() body: UpdateMeDto) {
    return this.users.updateMe(req.user.userId, body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('me/change-password')
  async changePassword(@Req() req: AuthedRequest, @Body() body: ChangePasswordDto) {
    return this.users.changePassword(req.user.userId, body.oldPassword, body.newPassword);
  }
}

