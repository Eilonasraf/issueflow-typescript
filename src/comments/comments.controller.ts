import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CommentsService, CommentView } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@Controller('tickets/:ticketId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findByTicket(
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<CommentView[]> {
    return this.commentsService.findByTicket(ticketId);
  }

  @Post()
  @HttpCode(200)
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CommentView> {
    return this.commentsService.create(ticketId, dto, user.sub);
  }

  @Patch(':commentId')
  @HttpCode(200)
  async update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.commentsService.update(ticketId, commentId, dto, user.sub);
  }

  @Delete(':commentId')
  @HttpCode(200)
  async remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.commentsService.remove(ticketId, commentId, user.sub);
  }
}
