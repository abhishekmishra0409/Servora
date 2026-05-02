import { IsOptional, IsString } from 'class-validator';

export class CreateServiceRequestDto {
  @IsString()
  requestType!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

