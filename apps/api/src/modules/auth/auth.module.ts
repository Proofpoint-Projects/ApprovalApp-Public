import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { SamlStrategy } from './saml.strategy';
import { SessionSerializer } from './session.serializer';

@Module({
  imports: [PassportModule.register({ session: true }), UsersModule, AuditModule],
  controllers: [AuthController],
  providers: [SamlStrategy, SessionSerializer]
})
export class AuthModule {}
