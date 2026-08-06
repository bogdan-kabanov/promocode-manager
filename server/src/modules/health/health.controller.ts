import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/auth.decorators';
import { HealthService, HealthReport } from './health.service';

/**
 * Excluded from the `/api` global prefix, so the container healthcheck can call
 * `GET /health` directly; `GET /api/health` is kept for the browser client.
 */
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get(['health', 'api/health'])
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthReport> {
    const report = await this.health.check();
    response.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
