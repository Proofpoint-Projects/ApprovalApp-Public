import { Body, Controller, Get, Post } from '@nestjs/common';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { SetupService } from './setup.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  async getStatus() {
    return this.setupService.getStatus();
  }

  @Roles('ADMIN')
  @Post('bootstrap')
  async bootstrap(@Body() dto: BootstrapSetupDto) {
    return this.setupService.bootstrap(dto);
  }
}