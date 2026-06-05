import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!required || required.length === 0) return true;

    const { user } = ctx.switchToHttp().getRequest<{ user: { permissions: string[] } }>();

    if (!user?.permissions) throw new ForbiddenException('Access denied');

    const hasAll = required.every((p) => user.permissions.includes(p));
    if (!hasAll) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}


