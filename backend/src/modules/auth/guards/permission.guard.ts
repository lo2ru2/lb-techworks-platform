import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRES_PERMS_KEY = 'requiresPerms';
export const RequiresPermissions = (...perms: string[]) => SetMetadata(REQUIRES_PERMS_KEY, perms);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRES_PERMS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: { perms?: string[] } }>();
    const perms = new Set(req.user?.perms ?? []);
    const ok = required.every((p) => perms.has(p));
    if (!ok) throw new ForbiddenException('Nuk ke leje per kete veprim');
    return true;
  }
}

