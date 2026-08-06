import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation.pipe';
import { loadConfiguration } from './config/configuration';

async function bootstrap(): Promise<void> {
  const config = loadConfiguration();
  // TZ must be applied before anything formats a date.
  process.env.TZ = config.timezone;

  const app = await NestFactory.create(AppModule, { logger: config.logLevels });

  app.setGlobalPrefix(config.apiPrefix, {
    // The health controller declares both paths itself: the container
    // healthcheck hits /health, the browser client hits /api/health.
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: `${config.apiPrefix}/health`, method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `PromoCode Manager API is listening on http://0.0.0.0:${config.port}/${config.apiPrefix}`,
  );
}

void bootstrap();
