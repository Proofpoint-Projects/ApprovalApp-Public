import { IsOptional, IsString } from 'class-validator';

export class SaveProofpointConfigDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;
}
