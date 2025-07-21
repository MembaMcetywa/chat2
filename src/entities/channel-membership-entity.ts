import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
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
  channel: Channel;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' }) joined_at: Date;

  @Column({ type: 'timestamptz', nullable: true }) last_read: Date;
}
