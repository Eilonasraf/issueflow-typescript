import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  ParseIntPipe,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ImportSummary, TicketCsvService } from './ticket-csv.service';
import { ImportTicketsDto } from './dto/import-tickets.dto';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

@Controller('tickets')
export class CsvController {
  constructor(private readonly csv: TicketCsvService) {}

  @Get('export')
  async export(
    @Query('projectId', ParseIntPipe) projectId: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const body = await this.csv.exportTickets(projectId);
    res.type('text/csv');
    res.header(
      'Content-Disposition',
      `attachment; filename="tickets-project-${projectId}.csv"`,
    );
    return body;
  }

  @Post('import')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  import(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportTicketsDto,
    @CurrentUser() user: JwtUser,
  ): Promise<ImportSummary> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('CSV file is required');
    }
    return this.csv.importTickets(file.buffer, dto.projectId, user.sub);
  }
}
