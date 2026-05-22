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
  UseInterceptors,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';

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

  @Get(':ticketId')
  findOne(@Param('ticketId', ParseIntPipe) ticketId: number): Promise<Ticket> {
    return this.ticketsService.findOne(ticketId);
  }

  @Post()
  @HttpCode(200)
  create(@Body() dto: CreateTicketDto): Promise<Ticket> {
    return this.ticketsService.create(dto);
  }

  @Patch(':ticketId')
  @HttpCode(200)
  async update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() dto: UpdateTicketDto,
  ): Promise<void> {
    await this.ticketsService.update(ticketId, dto);
  }

  @Delete(':ticketId')
  @HttpCode(200)
  async remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
  ): Promise<void> {
    await this.ticketsService.remove(ticketId);
  }
}
