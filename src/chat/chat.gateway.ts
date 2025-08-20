import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/ws-jwt.guard';

type JwtUser = { id: string; username?: string; roles?: string[] };

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private socketsPerUser = new Map<string, number>();

  constructor(private readonly chat: ChatService) {}
  afterInit(server: Server) {
    server.use((socket, next) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const rawToken =
        socket.handshake.auth?.token ||
        (socket.handshake.headers['authorization'] as string)?.replace(
          /^Bearer /,
          '',
        );

      if (!rawToken) {
        console.error('[WS] Missing token on handshake');
        return next(new Error('Unauthorized: missing token'));
      }

      try {
        if (!process.env.JWT_SECRET) {
          console.error('[WS] JWT_SECRET missing');
          return next(
            new Error('Unauthorized: server misconfig (no JWT_SECRET)'),
          );
        }

        const payload = jwt.verify(rawToken, process.env.JWT_SECRET) as {
          id: string;
        };
        if (!payload?.id) {
          console.error('[WS] Token has no id claim');
          return next(new Error('Unauthorized: invalid claims'));
        }

        socket.data.user = payload;
        next();
      } catch (e: any) {
        console.error('[WS] JWT verify failed:', e.message);
        next(new Error(`Unauthorized: ${e.message}`));
      }
    });
  }

  handleConnection(client: Socket) {
    const userId = (client.data.user as JwtUser).id;
    const count = this.socketsPerUser.get(userId) ?? 0;
    this.socketsPerUser.set(userId, count + 1);
    if (count === 0) this.server.emit('user.online', { userId });
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data.user as JwtUser | undefined)?.id;
    if (!userId) return;
    const count = (this.socketsPerUser.get(userId) ?? 1) - 1;
    if (count <= 0) {
      this.socketsPerUser.delete(userId);
      this.server.emit('user.offline', { userId });
    } else {
      this.socketsPerUser.set(userId, count);
    }
  }

  @SubscribeMessage('channel.join')
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number },
  ) {
    client.join(`channel:${data.channelId}`);
    client.emit('channel.joined', { channelId: data.channelId });
  }

  @SubscribeMessage('message.send')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      channelId: number;
      payload: { text?: string; attachments?: any[]; reply_to?: number };
    },
  ) {
    const userId = (client.data.user as JwtUser).id;
    const saved = await this.chat.saveMessage({
      channelId: data.channelId,
      senderId: userId,
      payload: {
        text: data.payload.text ?? '',
        attachments: data.payload.attachments ?? [],
      },
      reply_to: data.payload.reply_to,
    });
    this.server.to(`channel:${data.channelId}`).emit('message.new', saved);
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number },
  ) {
    const userId = (client.data.user as JwtUser).id;
    client
      .to(`channel:${data.channelId}`)
      .emit('typing', { userId, channelId: data.channelId });
  }
}
