import { IsEnum, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export enum CourierRealtimeStatusDto {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export class UpdateCourierLocationDto {
  @IsOptional()
  @IsUUID()
  courierId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  // Backward-compatible aliases used in Phase 3.
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(350)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsEnum(CourierRealtimeStatusDto)
  status?: CourierRealtimeStatusDto;
}
