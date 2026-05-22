import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/user.entity';
import { Project } from './projects/project.entity';
import { Ticket } from './tickets/ticket.entity';
import { Comment } from './comments/comment.entity';
import { AuditLog } from './audit-logs/audit-log.entity';
import { TicketDependency } from './tickets/ticket-dependency.entity';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'issueflow',
      password: 'issueflow',
      database: 'issueflow_mvp',
      entities: [User, Project, Ticket, Comment, AuditLog, TicketDependency],
      synchronize: true,
    }),
    UsersModule,
    ProjectsModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
