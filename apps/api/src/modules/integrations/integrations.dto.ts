import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateProofpointTokenDto {
  @IsString()
  @IsNotEmpty()
  integrationKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsUrl({ require_tld: false })
  baseUrl!: string;

  @IsString()
  @MinLength(12)
  bearerToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class RotateProofpointTokenDto {
  @IsString()
  @MinLength(12)
  bearerToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
