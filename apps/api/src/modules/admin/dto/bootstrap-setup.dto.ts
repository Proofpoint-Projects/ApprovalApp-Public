import { IsOptional, IsString, MinLength } from 'class-validator';

export class BootstrapSetupDto {
  @IsString()
  @MinLength(3)
  clientId!: string;

  @IsString()
  @MinLength(3)
  clientSecret!: string;

  @IsOptional()
  @IsString()
  webhookSharedSecret?: string;
}
