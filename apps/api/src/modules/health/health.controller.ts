import { Controller, Get } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  health(): { status: string; timestamp: string } {
    return this.healthService.getHealth();
  }

  @Get('ready')
  ready(): { ready: boolean } {
    return this.healthService.getReady();
  }
}

