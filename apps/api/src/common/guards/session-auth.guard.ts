import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  private readonly logger = new Logger(SessionAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context.switchToHttp().getRequest();
    const url = request?.url || '';
    const controller = context.getClass()?.name;
    const handler = context.getHandler()?.name;
    const isAuthenticated = Boolean(request.isAuthenticated?.());
    const hasUser = Boolean(request.user);

    this.logger.log(
      JSON.stringify({
        url,
        controller,
        handler,
        isPublic,
        hasUser,
        isAuthenticated
      })
    );

    if (isPublic) {
      this.logger.log(`[ALLOW_PUBLIC] ${request.method} ${url}`);
      return true;
    }

    if (request.method === 'OPTIONS') {
      this.logger.log(`[ALLOW_OPTIONS] ${request.method} ${url}`);
      return true;
    }

    if (isAuthenticated && hasUser) {
      this.logger.log(`[ALLOW_SESSION] ${request.method} ${url}`);
      return true;
    }

    this.logger.warn(`[BLOCK_UNAUTHORIZED] ${request.method} ${url}`);
    throw new UnauthorizedException('Sessao invalida ou expirada.');
  }
}