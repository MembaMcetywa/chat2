import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ChannelMembership } from './channel-membership-entity';
import { Message } from './message.entity';

@Entity({ name: 'channels' })
export class Channel {
  @PrimaryGeneratedColumn() id: number;

  @Column({ unique: true }) name: string;
  @Column({ type: 'text', default: 'public' }) type:
    | 'public'
    | 'private'
    | 'direct';
  @Column({ type: 'jsonb', nullable: true }) metadata: any;

  @ManyToOne(() => User, (user) => user.createdChannels, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;

  @OneToMany(() => ChannelMembership, (cm) => cm.channel)
  memberships: ChannelMembership[];
  @OneToMany(() => Message, (msg) => msg.channel) messages: Message[];
}
