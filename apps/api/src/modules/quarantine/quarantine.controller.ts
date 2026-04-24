import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Query,
  ForbiddenException
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuarantineService } from './quarantine.service';
import { SetupService } from '../admin/setup.service';

type PresetUnit = 'hours' | 'days' | 'weeks';
type PresetType = '1h' | '24h' | '7d' | '30d' | 'custom';

@Roles('ADMIN', 'APPROVER')
@Controller('quarantine')
export class QuarantineController {
  constructor(
    private readonly quarantineService: QuarantineService,
    private readonly setupService: SetupService
  ) {}

  private async ensureSetupCompleted(user: any) {
    const status = await this.setupService.getStatus();

    if (status.requiresSetup && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Configuracao inicial pendente.');
    }
  }

  @Get('my-items')
  async listMine(
    @CurrentUser() user: any,
    @Query('preset') preset?: PresetType,
    @Query('customValue') customValue?: string,
    @Query('customUnit') customUnit?: PresetUnit
  ) {
    await this.ensureSetupCompleted(user);

    try {
      return await this.quarantineService.listMine(user, {
        preset: preset || '30d',
        customValue: customValue ? Number(customValue) : undefined,
        customUnit: customUnit || 'days'
      });
    } catch {
      throw new InternalServerErrorException('Erro de configuração, contate o administrador.');
    }
  }

  @Get('by-fqid')
  async getByFqid(@Query('fqid') fqid: string, @CurrentUser() user: any) {
    await this.ensureSetupCompleted(user);
    return this.quarantineService.getByFqid(user, fqid);
  }

  @Get(':id')
  async getOne(@CurrentUser() user: any, @Param('id') id: string) {
    await this.ensureSetupCompleted(user);

    try {
      return await this.quarantineService.getOne(user, id);
    } catch (error: any) {
      throw new InternalServerErrorException(error?.message || 'Erro ao consultar detalhe do evento.');
    }
  }



  @Post('approve')
  async approveOne(
    @CurrentUser() user: any,
    @Body() body: { fqid: string; justification?: string; emailItem?: any }
  ) {
    await this.ensureSetupCompleted(user);

    try {
      console.log('[controller] approve body ->', JSON.stringify(body));

      return await this.quarantineService.approveOne(user, {
        fqid: body.fqid,
        justification: body.justification || '',
        emailItem: body.emailItem || null
      });
    } catch (error: any) {
      throw new InternalServerErrorException(error?.message || 'Erro ao aprovar evento.');
    }
  }

  @Post('bulk-approve')
  async bulkApprove(
    @CurrentUser() user: any,
    @Body() body: { items: { fqid: string; justification?: string; emailItem?: any }[] }
  ) {
    await this.ensureSetupCompleted(user);

    try {
      console.log('[controller] bulk approve body ->', JSON.stringify(body));

      return await this.quarantineService.approveMany(
        user,
        (body.items || []).map((item) => ({
          fqid: item.fqid,
          justification: item.justification || '',
          emailItem: item.emailItem || null
        }))
      );
    } catch (error: any) {
      throw new InternalServerErrorException(error?.message || 'Erro ao aprovar eventos.');
    }
  }
}