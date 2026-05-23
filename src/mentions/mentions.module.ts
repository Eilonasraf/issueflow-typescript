import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from '../comments/comment.entity';
import { CommentMention } from '../comments/comment-mention.entity';
import { User } from '../users/user.entity';
import { MentionsService } from './mentions.service';
import { MentionsController } from './mentions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CommentMention, Comment, User])],
  controllers: [MentionsController],
  providers: [MentionsService],
  exports: [MentionsService],
})
export class MentionsModule {}
