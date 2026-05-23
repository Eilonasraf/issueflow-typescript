import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { Project } from './projects/project.entity';
import { Ticket } from './tickets/ticket.entity';
import { Comment } from './comments/comment.entity';
import { CommentMention } from './comments/comment-mention.entity';
import { Attachment } from './attachments/attachment.entity';
import { AuditLog } from './audit-logs/audit-log.entity';
import { TicketDependency } from './tickets/ticket-dependency.entity';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TicketsModule } from './tickets/tickets.module';
import { CommentsModule } from './comments/comments.module';
import { AuthModule } from './auth/auth.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { MentionsModule } from './mentions/mentions.module';
import { AttachmentsModule } from './attachments/attachments.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'issueflow',
      password: 'issueflow',
      database: 'issueflow_mvp',
      entities: [
        User,
        Project,
        Ticket,
        Comment,
        AuditLog,
        TicketDependency,
        CommentMention,
        Attachment,
      ],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    AuditLogsModule,
    UsersModule,
    ProjectsModule,
    TicketsModule,
    CommentsModule,
    MentionsModule,
    AttachmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
