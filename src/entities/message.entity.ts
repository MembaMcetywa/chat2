import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Channel } from './channel.entity';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Channel, (channel) => channel.messages, {
    onDelete: 'CASCADE',
  })
  channel: Channel;

  @ManyToOne(() => User, (user) => user.messages, { onDelete: 'CASCADE' })
  sender: User;

  @Column({ type: 'bytea' }) encrypted_payload: Buffer;
  @Column({ type: 'bytea' }) iv: Buffer;
  @Column({ type: 'bytea' }) auth_tag: Buffer;

  @Column({ default: 'aes-256-gcm' }) algo: string;
  @Column({ default: 'v1' }) key_version: string;

  @Column({ nullable: true })
  @JoinColumn({ name: 'reply_to' })
  reply_to: number;

  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
}
