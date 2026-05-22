import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  BlockerView,
  TicketDependenciesService,
} from './ticket-dependencies.service';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@Controller('tickets/:ticketId/dependencies')
export class TicketDependenciesController {
  constructor(private readonly service: TicketDependenciesService) {}

  @Post()
  @HttpCode(200)
  async add(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: CreateDependencyDto,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.service.addDependency(ticketId, dto.blockedBy, user.sub);
  }

  @Get()
  list(
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<BlockerView[]> {
    return this.service.listDependencies(ticketId);
  }

  @Delete(':blockerId')
  @HttpCode(200)
  async remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('blockerId', ParseIntPipe) blockerId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.service.removeDependency(ticketId, blockerId, user.sub);
  }
}
