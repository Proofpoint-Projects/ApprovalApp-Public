import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class DecisionDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1 / 60)
  @Max(6)
  @IsIn([1 / 60, 1, 6])
  durationHours?: number;
}

export class ListApprovalsQueryDto {
  @IsOptional()
  @IsIn(['EMAIL_QUARANTINE', 'ENDPOINT_ITM', 'DLP'])
  source?: 'EMAIL_QUARANTINE' | 'ENDPOINT_ITM' | 'DLP';

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'PROCESSING', 'ERROR'])
  status?: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'PROCESSING' | 'ERROR';

  @IsOptional()
  @IsString()
  user?: string;
}
