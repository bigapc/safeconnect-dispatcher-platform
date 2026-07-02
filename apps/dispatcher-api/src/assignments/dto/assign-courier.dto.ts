import { IsUUID } from 'class-validator';

export class AssignCourierDto {
  @IsUUID()
  courierId!: string;
}
