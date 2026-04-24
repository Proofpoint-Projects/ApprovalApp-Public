import { IsArray, IsEmail, IsString, ArrayMaxSize } from 'class-validator';

export class SaveApproverScopeDto {
  @IsEmail()
  email!: string;

  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  folders!: string[];
}