import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from '@node-saml/passport-saml';
import { readFileSync } from 'fs';
import { UsersService } from '../users/users.service';

function loadIdpCerts(path?: string): string | string[] {
  if (!path) return '';

  const raw = readFileSync(path, 'utf8').trim();
  const matches = raw.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);

  if (!matches || matches.length === 0) {
    return raw;
  }

  return matches.length === 1 ? matches[0].trim() : matches.map((c) => c.trim());
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function parseEnvList(value?: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  constructor(private readonly usersService: UsersService) {
    console.log('[saml] callbackUrl ->', process.env.SAML_CALLBACK_URL);
    console.log('[saml] entryPoint ->', process.env.SAML_ENTRY_POINT);
    console.log('[saml] issuer ->', process.env.SAML_ISSUER);
    console.log('[saml] idp cert file ->', process.env.SAML_IDP_CERT_FILE);
    super(
      {
        callbackUrl: process.env.SAML_CALLBACK_URL || '',
        entryPoint: process.env.SAML_ENTRY_POINT || '',
        issuer: process.env.SAML_ISSUER || '',
        idpCert: loadIdpCerts(process.env.SAML_IDP_CERT_FILE),
        identifierFormat: undefined,
        disableRequestedAuthnContext: true,
        wantAuthnResponseSigned: false,
        wantAssertionsSigned: false,
        validateInResponseTo: 'never',
        passReqToCallback: true
      } as any,
      async (
        _req: any,
        profile: Profile | null,
        done: (err: Error | null, user?: Record<string, unknown>) => void
      ) => {
        try {
          if (!profile) {
            done(new Error('SAML profile not received'));
            return;
          }

          const rawProfile = profile as unknown as Record<string, unknown>;

          const groups = [
            ...toArray(rawProfile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']),
            ...toArray(rawProfile.groups),
            ...toArray(rawProfile['groups'])
          ];

          const uniqueGroups = Array.from(new Set(groups));

          const adminGroups = parseEnvList(process.env.SAML_ADMIN_GROUP_IDS);
          const approverGroups = parseEnvList(process.env.SAML_APPROVER_GROUP_IDS);

          let resolvedRole = 'APPROVER';

          if (uniqueGroups.some((group) => adminGroups.includes(group))) {
            resolvedRole = 'ADMIN';
          } else if (uniqueGroups.some((group) => approverGroups.includes(group))) {
            resolvedRole = 'APPROVER';
          }

          const enrichedProfile = {
            ...rawProfile,
            resolvedRole,
            resolvedGroups: uniqueGroups
          };

          const user = await this.usersService.upsertFromSaml(enrichedProfile);

          done(null, user as Record<string, unknown>);
        } catch (error) {
          done(error as Error);
        }
      }
    );
  }

  async validate(): Promise<null> {
    return null;
  }
}