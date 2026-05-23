import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../users/user.entity';

@Entity('comment_mentions')
@Unique(['commentId', 'userId'])
export class CommentMention {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'comment_id' })
  commentId: number;

  @ManyToOne(() => Comment, (comment) => comment.mentions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
