import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { AppModule } from './app.module';
import { loadEnvironment } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnvironment();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  if (env.NODE_ENV === 'production') {
    app.use(
      csurf({
        cookie: {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        },
      }),
    );
  }

  app.enableCors({
    origin: [env.APP_URL],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(configService.get<number>('PORT', 3001));
}

void bootstrap().catch((error: unknown) => {
  console.error('API bootstrap failed', error);
  process.exit(1);
});
