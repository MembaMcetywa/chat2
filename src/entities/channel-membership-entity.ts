import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Channel } from './channel.entity';

@Entity({ name: 'channel_memberships' })
@Unique(['channel', 'user'])
export class ChannelMembership {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Channel, (channel) => channel.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' }) joined_at: Date;

  @Column({ type: 'timestamptz', nullable: true }) last_read: Date;
}
