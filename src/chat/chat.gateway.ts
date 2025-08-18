import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // simple presence counter
  private socketsPerUser = new Map<string, number>();

  constructor(private readonly chat: ChatService) {}

  handleConnection(client: Socket) {
    const userId = (client as any).user.id as string;
    const count = this.socketsPerUser.get(userId) ?? 0;
    this.socketsPerUser.set(userId, count + 1);
    if (count === 0) this.server.emit('user.online', { userId });
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).user?.id as string | undefined;
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
    const userId = (client as any).user.id as string;
    const saved = await this.chat.saveMessage({
      channelId: data.channelId,
      senderId: userId,
      payload: {
        text: data.payload.text ?? '',
        attachments: data.payload.attachments ?? [],
      },
      reply_to: data.payload.reply_to,
    });

    // Broadcast to the room
    this.server.to(`channel:${data.channelId}`).emit('message.new', saved);
  }

  @SubscribeMessage('typing')
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: number },
  ) {
    const userId = (client as any).user.id as string;
    client
      .to(`channel:${data.channelId}`)
      .emit('typing...', { userId, channelId: data.channelId });
  }
}
