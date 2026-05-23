import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateCommentDto {
  /** Current version of the comment as last seen by the client (optimistic lock). */
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}
