import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './comment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { User } from '../users/user.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Ticket, User]), AuditLogsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
