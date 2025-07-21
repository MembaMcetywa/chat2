import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Channel } from './channel.entity';
import { ChannelMembership } from './channel-membership-entity';
import { Message } from './message.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ unique: true }) username: string;
  @Column({ unique: true }) email: string;

  @Column({ nullable: true }) display_name: string;
  @Column({ nullable: true }) avatar_url: string;

  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;

  @OneToMany(() => Channel, (channel) => channel.created_by)
  createdChannels: Channel[];
  @OneToMany(() => ChannelMembership, (cm) => cm.user)
  memberships: ChannelMembership[];
  @OneToMany(() => Message, (msg) => msg.sender) messages: Message[];
}
