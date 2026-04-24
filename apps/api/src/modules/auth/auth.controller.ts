import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionAuthGuard } from '../../common/guards/session-auth.guard';
import { AuditService } from '../audit/audit.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auditService: AuditService) {}

  @Public()
  @Get('saml/login') 
  @UseGuards(AuthGuard('saml'))
  login() {
    return;
  }

  @Public()
  @Post('saml/acs')
  @UseGuards(AuthGuard('saml'))
  async acs(@Req() req: any, @Res() res: any) {
    console.log('[auth] ACS user ->', req.user);
    console.log('[auth] ACS session id before login ->', req.sessionID);
    console.log('[auth] ACS req.secure ->', req.secure);
    console.log('[auth] ACS x-forwarded-proto ->', req.get('x-forwarded-proto'));

    await new Promise<void>((resolve, reject) => {
      req.logIn(req.user, (err: any) => {
        if (err) {
          console.error('[auth] req.logIn error ->', err);
          return reject(err);
        }
        console.log('[auth] req.logIn ok');
        resolve();
      });
    });

    await this.auditService.record({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'LOGIN',
      entityType: 'auth',
      entityId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    req.session.save((err: any) => {
      if (err) {
        console.error('[auth] session save error ->', err);
        return res.status(500).json({ message: 'Falha ao salvar sessao' });
      }

      console.log('[auth] session saved ->', req.sessionID);
      console.log('[auth] session passport ->', req.session?.passport);
      console.log('[auth] set-cookie before redirect ->', res.getHeader('Set-Cookie'));

      return res.redirect('/');
    });
  }

  @Public()
  @Get('saml/acs')
  samlAcsGetFallback(@Res() res: any) {
    return res.redirect('/login?error=saml_acs_requires_post');
  }

  @Public()
  @Get('saml/metadata')
  metadata(@Res() res: any) {
    const entityId = process.env.SAML_ISSUER;
    const acs = process.env.SAML_CALLBACK_URL;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${acs}" index="1" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

    res.type('application/xml').send(xml);
  }

  @Get('me')
  me(@Req() req: any, @Res() res: any) {
    console.log('[auth] /me session id ->', req.sessionID);
    console.log('[auth] /me isAuthenticated ->', req.isAuthenticated?.());
    console.log('[auth] /me user ->', req.user);
    console.log('[auth] /me cookie header ->', req.headers.cookie);

    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({
        message: 'Sessao invalida ou expirada.',
        isAuthenticated: req.isAuthenticated?.() || false,
        sessionID: req.sessionID || null,
        hasCookieHeader: Boolean(req.headers.cookie)
      });
    }

    return res.json(req.user);
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: any, @Res() res: any) {
    const actor = req.user;

    await this.auditService.record({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'LOGOUT',
      entityType: 'auth',
      entityId: actor?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    req.logout?.((logoutErr: any) => {
      if (logoutErr) {
        console.error('[auth/logout] erro no req.logout ->', logoutErr);
      }

      req.session?.destroy((sessionErr: any) => {
        if (sessionErr) {
          console.error('[auth/logout] erro ao destruir sessao ->', sessionErr);
          return res.status(500).json({ message: 'Erro ao encerrar sessao.' });
        }

        console.log('[auth/logout] sessao destruida com sucesso');

        res.clearCookie('approval.sid', {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });

        return res.status(200).json({ ok: true });
      });
    });
  }
}
