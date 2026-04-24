import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApproverScopesService } from './approver-scopes.service';
import { SaveApproverScopeDto } from './dto/save-approver-scope.dto';

@Roles('ADMIN')
@Controller('admin/approver-scopes')
export class ApproverScopesController {
  constructor(private readonly approverScopesService: ApproverScopesService) {}

  @Get()
  list() {
    return this.approverScopesService.listApproversWithScopes();
  }

  @Post()
  save(
    @CurrentUser() user: any,
    @Body() body: SaveApproverScopeDto,
    @Req() req: any
  ) {
    return this.approverScopesService.saveScopeByEmail(
      {
        id: user?.id,
        email: user?.email
      },
      body.email,
      body.folders,
      {
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    );
  }
}