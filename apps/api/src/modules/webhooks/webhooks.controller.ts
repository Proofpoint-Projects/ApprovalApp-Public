import { Controller, Headers, Post, Req, Body } from '@nestjs/common';
import { ApprovalSource } from '@prisma/client';
import { WebhooksService } from './webhooks.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('endpoint-itm')
  endpointItm(@Req() req: any, @Body() body: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    console.log('[webhook/endpoint-itm] headers ->', req.headers);
    console.log('[webhook/endpoint-itm] x-webhook-token ->', req.headers['x-token-webhook']);
    console.log('[webhook/endpoint-itm] x-proofpoint-token ->', req.headers['x-proofpoint-token']);
    console.log('[webhook/endpoint-itm] authorization ->', req.headers['authorization']);
    return this.webhooksService.handle(
      ApprovalSource.ENDPOINT_ITM,
      body,
      req.rawBody,
      headers
    );
  }

  @Public()
  @Post('dlp')
  dlp(@Req() req: any, @Body() body: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    return this.webhooksService.handle(
      ApprovalSource.DLP,
      body,
      req.rawBody,
      headers
    );
  }
}
