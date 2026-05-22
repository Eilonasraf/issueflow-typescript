import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('tickets')
@UseInterceptors(ClassSerializerInterceptor)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findByProject(
    @Query('projectId', ParseIntPipe) projectId: number,
  ): Promise<Ticket[]> {
    return this.ticketsService.findByProject(projectId);
  }

  @Get('deleted')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findDeleted(
    @Query('projectId', ParseIntPipe) projectId: number,
  ): Promise<Ticket[]> {
    return this.ticketsService.findDeleted(projectId);
  }

  @Get(':ticketId')
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number): Promise<Ticket> {
    return this.ticketsService.findOne(ticketId);
  }

  @Post()
  @HttpCode(200)
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: JwtUser,
  ): Promise<Ticket> {
    return this.ticketsService.create(dto, user.sub);
  }

  @Patch(':ticketId')
  @HttpCode(200)
  async update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.ticketsService.update(ticketId, dto, user.sub);
  }

  @Delete(':ticketId')
  @HttpCode(200)
  async remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.ticketsService.remove(ticketId, user.sub);
  }

  @Post(':ticketId/restore')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async restore(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.ticketsService.restore(ticketId, user.sub);
  }
}
