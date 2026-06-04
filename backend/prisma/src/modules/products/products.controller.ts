import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { ProductsService } from './products.service';
import { PermissionGuard, RequiresPermissions } from '../auth/guards/permission.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ImportProductsDto } from './dto/import-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type AuthedRequest = Request & { user: { userId: string } };

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('products.read')
  @Get('admin/export')
  async exportAdmin(
    @Res({ passthrough: false }) res: Response,
    @Query('format') format?: string,
    @Query('q') q?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pack = await this.products.exportAdmin(format, q, isActive);
    res.setHeader('Content-Type', pack.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${pack.filename}"`);
    res.send(pack.body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('products.write')
  @Post('admin/import')
  async importAdmin(@Body() body: ImportProductsDto, @Req() req: AuthedRequest) {
    return this.products.importMany(body.items, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('products.read')
  @Get('admin/list')
  async listAdmin(@Query('q') q?: string, @Query('isActive') isActive?: string) {
    return this.products.listAllAdmin(q, isActive);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('products.write')
  @Post()
  async create(@Req() req: AuthedRequest, @Body() dto: CreateProductDto) {
    return this.products.create(dto, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('products.write')
  @Patch(':id')
  async update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto, req.user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequiresPermissions('products.write')
  @Delete(':id')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.products.softDelete(id, req.user.userId);
  }

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('category') categoryRaw?: string,
    @Query('minPriceCents') minPriceCents?: string,
    @Query('maxPriceCents') maxPriceCents?: string,
    @Query('sort') sort?: 'newest' | 'price_asc' | 'price_desc',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const category = categoryRaw
      ? (() => {
          try {
            return decodeURIComponent(categoryRaw).trim();
          } catch {
            return categoryRaw.trim();
          }
        })()
      : undefined;

    return this.products.list({
      q,
      category,
      minPriceCents: minPriceCents ? Number(minPriceCents) : undefined,
      maxPriceCents: maxPriceCents ? Number(maxPriceCents) : undefined,
      sort,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 12,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: Request) {
    const authed = req as AuthedRequest;
    const p = await this.products.findById(id, {
      userId: authed.user?.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (!p) throw new NotFoundException('Produkti nuk u gjet');
    return p;
  }
}
