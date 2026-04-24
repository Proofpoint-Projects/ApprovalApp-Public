import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import passport from 'passport';
import { json, urlencoded, type Request, type Response } from 'express';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

declare module 'http' {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

async function bootstrap() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET nao configurado.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL nao configurado.');
  }

  const app = await NestFactory.create(AppModule);

  if (process.env.TRUST_PROXY === 'true') {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(cookieParser());
  app.use(
    json({
      limit: '5mb',
      verify: (req: Request, _res: Response, buffer: Buffer) => {
        req.rawBody = buffer;
      }
    })
  );
  app.use(
    urlencoded({
      extended: true,
      limit: '2mb',
      verify: (req: Request, _res: Response, buffer: Buffer) => {
        req.rawBody = buffer;
      }
    })
  );

  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: 'user_sessions'
      }),
      name: 'approval.sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      rolling: true,
      saveUninitialized: false,
      proxy: process.env.TRUST_PROXY === 'true',
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000
      }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const sessionAuthGuard = app.get(SessionAuthGuard);
  const rolesGuard = app.get(RolesGuard);

  app.useGlobalGuards(sessionAuthGuard, rolesGuard);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.setGlobalPrefix('api');
  await app.listen(3001, '0.0.0.0');
}

bootstrap();