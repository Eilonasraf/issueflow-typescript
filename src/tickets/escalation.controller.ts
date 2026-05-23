import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  EscalationSummary,
  TicketEscalationService,
} from './ticket-escalation.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('tickets')
export class EscalationController {
  constructor(private readonly escalation: TicketEscalationService) {}

  @Post('escalate')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  run(): Promise<EscalationSummary> {
    return this.escalation.runEscalation();
  }
}
