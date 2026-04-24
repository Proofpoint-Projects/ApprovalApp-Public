import { Controller, Get, Param, Post, Body, Query, Req} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApprovalSource, ApprovalStatus } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { ApprovalsService } from './approvals.service';
import { DecisionDto, ListApprovalsQueryDto } from './decision.dto';
import { RolesGuard } from '../../common/guards/roles.guard';

@Roles('ADMIN', 'APPROVER')
@Controller('approvals')


export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

 @Get()
  list(@CurrentUser() user: any, @Query() query: ListApprovalsQueryDto) {
    const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

    return this.approvalsService.list({
      source: query.source as ApprovalSource | undefined,
      status: query.status as ApprovalStatus | undefined,
      user: query.user,
      approverId: isAdmin ? undefined : user?.id
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.approvalsService.getById(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: any, @Body() body: DecisionDto, @Req() req: any) {
    return this.approvalsService.approve(id, user, body, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  @Post(':id/deny')
  deny(@Param('id') id: string, @CurrentUser() user: any, @Body() body: DecisionDto, @Req() req: any) {
    return this.approvalsService.deny(id, user, body, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }
}
