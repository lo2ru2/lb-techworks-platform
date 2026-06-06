import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { PermissionGuard } from './guards/permission.guard';
import { AuthRepository } from './auth.repository';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const ttl = Number(config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? 900) || 900;
        return {
          secret: config.get<string>('JWT_ACCESS_SECRET') ?? 'change-me-access',
          signOptions: { expiresIn: `${ttl}s` },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, GoogleStrategy, PermissionGuard, AuthRepository, RateLimitGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, JwtStrategy, PermissionGuard],
})
export class AuthModule {}

