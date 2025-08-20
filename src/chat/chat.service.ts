// src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { Channel } from '../entities/channel.entity';
import { ChannelMembership } from '../entities/channel-membership-entity';
import { User } from '../entities/user.entity';
import { encryptMessage, decryptMessage } from '../crypto.util';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message) private messages: Repository<Message>,
    @InjectRepository(Channel) private channels: Repository<Channel>,
    @InjectRepository(ChannelMembership)
    private memberships: Repository<ChannelMembership>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private async assertMember(channelId: number, userId: string) {
    const member = await this.memberships.findOne({
      where: { channel: { id: channelId }, user: { id: userId } },
      relations: { channel: true, user: true },
    });
    if (!member) throw new ForbiddenException('Not a member of this channel');
  }

  async saveMessage(input: {
    channelId: number;
    senderId: string;
    payload: any; // { text, attachments }
    reply_to?: number;
  }) {
    // Ensure channel + membership exist
    const channel = await this.channels.findOne({
      where: { id: input.channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    await this.assertMember(input.channelId, input.senderId);

    const { iv, tag, ct } = encryptMessage(input.payload);

    const entity = this.messages.create({
      channel: { id: input.channelId } as any,
      sender: { id: input.senderId } as any,
      reply_to: input.reply_to ? ({ id: input.reply_to } as Message) : null,
      encrypted_payload: ct,
      iv,
      auth_tag: tag,
    });

    const saved = await this.messages.save(entity);

    // Return a transport-friendly DTO (with decrypted payload)
    return {
      id: saved.id,
      channelId: input.channelId,
      senderId: input.senderId,
      payload: input.payload,
      reply_to: saved.reply_to?.id ?? null,
      created_at: saved.created_at,
    };
  }

  async listMessages(channelId: number, limit = 50, before?: Date) {
    const rows = await this.messages.find({
      where: {
        channel: { id: channelId },
        ...(before ? { created_at: { $lt: before } as any } : {}),
      },
      relations: { sender: true },
      order: { created_at: 'DESC' },
      take: limit,
    });
    return rows
      .map((r) => ({
        id: r.id,
        channelId,
        sender: {
          id: r.sender.id,
          username: r.sender.username,
          avatar_url: r.sender.avatar_url,
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: decryptMessage(r.iv, r.auth_tag, r.encrypted_payload),
        reply_to: r.reply_to ?? null,
        created_at: r.created_at,
      }))
      .reverse();
  }
}
