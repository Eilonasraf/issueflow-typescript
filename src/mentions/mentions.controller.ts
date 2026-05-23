import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MentionsPage, MentionsService } from './mentions.service';
import { MentionsQueryDto } from './dto/mentions-query.dto';

@Controller('users/:userId/mentions')
export class MentionsController {
  constructor(private readonly mentionsService: MentionsService) {}

  @Get()
  list(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: MentionsQueryDto,
  ): Promise<MentionsPage> {
    return this.mentionsService.findForUser(
      userId,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }
}
