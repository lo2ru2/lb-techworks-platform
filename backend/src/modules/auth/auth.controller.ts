import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { requestClientMeta } from '../../common/request-meta';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(RateLimitGuard)
@RateLimit(40, 60)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @RateLimit(15, 3600)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      requestClientMeta(req),
      dto.phone,
    );
  }

  @Post('login')
  @RateLimit(30, 300)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, requestClientMeta(req));
  }

  @Post('change-password')
  @RateLimit(20, 600)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    return this.auth.changePassword(dto.email, dto.currentPassword, dto.newPassword, requestClientMeta(req));
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    return { ok: true };
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const session = req.user as
      | { accessToken: string; user: { id: string; email: string; fullName: string }; roles: string[] }
      | undefined;
    if (!session?.accessToken || !session.user) {
      return res.redirect('http://localhost:5173/login?error=google_auth_failed');
    }

    const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    const encodedUser = encodeURIComponent(JSON.stringify(session.user));
    const encodedRoles = encodeURIComponent(JSON.stringify(session.roles ?? []));
    const redirectUrl = `${frontendUrl.replace(/\/$/, '')}/auth/google/success?token=${encodeURIComponent(session.accessToken)}&user=${encodedUser}&roles=${encodedRoles}`;
    return res.redirect(redirectUrl);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    return this.auth.refresh(body.refreshToken);
  }
}

