import { IsEnum } from 'class-validator';

export enum AssignmentStatusDto {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class UpdateAssignmentStatusDto {
  @IsEnum(AssignmentStatusDto)
  status!: AssignmentStatusDto;
}
