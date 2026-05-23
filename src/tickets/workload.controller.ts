import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  TicketAssignmentService,
  WorkloadRow,
} from './ticket-assignment.service';

@Controller('projects/:projectId/workload')
export class WorkloadController {
  constructor(private readonly assignment: TicketAssignmentService) {}

  @Get()
  list(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<WorkloadRow[]> {
    return this.assignment.workload(projectId);
  }
}
