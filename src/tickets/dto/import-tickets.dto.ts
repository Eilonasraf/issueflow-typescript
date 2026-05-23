import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class ImportTicketsDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;
}
