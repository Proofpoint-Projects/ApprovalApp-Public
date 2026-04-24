import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';

@Injectable()
export class EndpointApprovalReaperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EndpointApprovalReaperService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly approvalsService: ApprovalsService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 60 * 1000);

    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private isDatabaseRecoveryError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');

  return (
    code === '57P03' ||
    message.includes('database system is in recovery mode') ||
    message.includes('database system is not yet accepting connections') ||
    message.includes('consistent recovery state has not been yet reached')
  );
}

  private async tick() {
    if (this.running) return;
    this.running = true;

    try {
      console.log('[REAPER] tick em', new Date().toISOString());
      const result = await this.approvalsService.processExpiredEndpointApprovals();
      console.log('[REAPER] resultado', JSON.stringify(result));

      if (result.processed > 0) {
        this.logger.log(`Auto-remocao executada para ${result.processed} grant(s).`);
      }
    } catch (error: any) {
      if (this.isDatabaseRecoveryError(error)) {
        this.logger.warn(
          'Banco ainda nao esta pronto (recovery/startup). Ciclo do reaper ignorado temporariamente.'
        );
        return;
      }

      this.logger.error(
        error?.message || 'Erro no reaper de aprovacoes endpoint',
        error?.stack
      );
    } finally {
      this.running = false;
    }
  }
}