import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum AssignmentPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateAssignmentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description!: string;

  @IsEnum(AssignmentPriorityDto)
  priority!: AssignmentPriorityDto;

  @IsOptional()
  @IsUUID()
  courierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  pickupAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLongitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  dropoffAddress?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLongitude?: number;
}
