import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const client: Socket = ctx.switchToWs().getClient();
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers['authorization'] as string)?.replace(
        /^Bearer /,
        '',
      );

    if (!token) return false;

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!);
      (client as any).user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
