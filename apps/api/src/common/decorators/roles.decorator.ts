import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles baseadas em EntraID (groups ou roles)xqx
 * Ex:
 * @Roles('ADMIN')
 * @Roles('APPROVER')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);