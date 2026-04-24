import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface SamlProfileLike {
  nameID?: string;
  email?: string;
  mail?: string;
  displayName?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'?: string;
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'?: string;
  'http://schemas.xmlsoap.org/claims/Group'?: string[] | string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'?: string[] | string;
  groups?: string[] | string;
  [key: string]: unknown;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  private resolveGroups(profile: SamlProfileLike): string[] {
    const raw =
      profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'] ||
      profile['http://schemas.xmlsoap.org/claims/Group'] ||
      profile.groups ||
      [];

    if (Array.isArray(raw)) {
      return raw.map(String);
    }

    return raw ? [String(raw)] : [];
  }

  private resolveRole(groups: string[]): UserRole | null {
    const adminGroups = (process.env.SAML_ADMIN_GROUP_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
    const approverGroups = (process.env.SAML_APPROVER_GROUP_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);

    if (groups.some((group) => adminGroups.includes(group))) {
      return UserRole.ADMIN;
    }

    if (groups.some((group) => approverGroups.includes(group))) {
      return UserRole.APPROVER;
    }

    return null;
  }

  async upsertFromSaml(profile: SamlProfileLike) {
    console.log('[saml] profile keys ->', Object.keys(profile || {}));
    console.log('[saml] raw groups claim (ms) ->', profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']);
    console.log('[saml] raw groups claim (xmlsoap Group) ->', profile['http://schemas.xmlsoap.org/claims/Group']);
    console.log('[saml] raw groups claim (groups) ->', profile.groups);
    console.log('[saml] raw profile email fields ->', {
      nameID: profile.nameID,
      email: profile.email,
      mail: profile.mail,
      emailClaim: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
    });

    const email =
      profile.email ||
      profile.mail ||
      profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      profile.nameID;

    if (!email) {
      throw new UnauthorizedException('Nao foi possivel identificar o email do usuario no SAML assertion.');
    }

    const groups = this.resolveGroups(profile);
    const role = this.resolveRole(groups);

    console.log('[saml] resolved groups ->', groups);
    console.log('[saml] env admin groups ->', (process.env.SAML_ADMIN_GROUP_IDS || '').split(',').map((v) => v.trim()).filter(Boolean));
    console.log('[saml] env approver groups ->', (process.env.SAML_APPROVER_GROUP_IDS || '').split(',').map((v) => v.trim()).filter(Boolean));
    console.log('[saml] resolved role ->', role);
    console.log('[saml] raw profile display fields ->', {
      displayName: profile.displayName,
      name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
      givenname: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
      surname: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
      allKeys: Object.keys(profile || {})
    });
    
    if (!role) {
      console.error('[saml] usuario sem grupo autorizado');
      throw new UnauthorizedException('Usuario sem grupo autorizado para acessar o portal.');
    }

    const displayName =
      profile.displayName ||
      profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      [profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'], profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']]
        .filter(Boolean)
        .join(' ') ||
      profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ||
      email;

    return this.prisma.user.upsert({
      where: { email },
      update: {
        displayName,
        externalId: profile.nameID || email,
        role,
        groupsJson: groups,
        lastLoginAt: new Date()
      },
      create: {
        email,
        displayName,
        externalId: profile.nameID || email,
        role,
        groupsJson: groups,
        lastLoginAt: new Date()
      }
    });
  }
}
