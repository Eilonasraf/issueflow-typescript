import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentMention } from './comment-mention.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MentionsModule } from '../mentions/mentions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, Ticket, User, CommentMention]),
    AuditLogsModule,
    MentionsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
