import { IsInt } from 'class-validator';

export class CreateDependencyDto {
  @IsInt()
  blockedBy: number;
}
