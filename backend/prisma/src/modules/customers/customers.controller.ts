import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { CustomersService } from './customers.service';
import { ImportCustomersDto } from './dto/import-customers.dto';

type AuthedRequest = Request & { user: { userId: string } };

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('customers.read')
  @Get('export')
  async export(
    @Res({ passthrough: false }) res: Response,
    @Query('format') format?: string,
    @Query('q') q?: string,
  ) {
    const pack = await this.customers.export(format, q);
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('customers.read')
  @Get()
  async list(@Query('q') q?: string) {
    return this.customers.list(q);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('customers.write')
  @Post('import')
  async import(@Body() body: ImportCustomersDto, @Req() req: AuthedRequest) {
    return this.customers.importMany(body, req.user.userId);
  }
}
