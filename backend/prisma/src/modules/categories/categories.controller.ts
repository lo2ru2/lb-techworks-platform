import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { CategoriesService } from './categories.service';
import { ImportCategoriesDto } from './dto/import-categories.dto';

type AuthedRequest = Request & { user: { userId: string } };

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get('public')
  async listPublic(@Query('q') q?: string) {
    return this.categories.list(q);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('categories.read')
  @Get('export')
  async export(
    @Res({ passthrough: false }) res: Response,
    @Query('format') format?: string,
    @Query('q') q?: string,
  ) {
    const pack = await this.categories.export(format, q);
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('categories.read')
  @Get()
  async list(@Query('q') q?: string) {
    return this.categories.list(q);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('categories.write')
  @Post('import')
  async import(@Body() body: ImportCategoriesDto, @Req() req: AuthedRequest) {
    return this.categories.importMany(body, req.user.userId);
  }
}
