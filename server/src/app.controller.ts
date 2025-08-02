import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import type { AppSummary, LoadingStatus } from './interfaces/interfaces';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getSummary(): Promise<AppSummary> {
    return this.appService.loadAndRetrieveSummary();
  }

  @Post('reload')
  async reloadMatches(): Promise<{ message: string }> {
    await this.appService.forceReloadMatches();
    return { message: 'Matches reloaded successfully' };
  }

  @Post('reload-teams')
  async reloadTeams(): Promise<{ message: string }> {
    await this.appService.forceReloadTeams();
    return { message: 'Teams reloaded successfully' };
  }

  @Post('reload-all')
  async reloadAll(): Promise<{ message: string }> {
    await this.appService.forceReloadAll();
    return { message: 'Teams and matches reloaded successfully' };
  }

  @Get('status')
  getStatus(): LoadingStatus {
    return this.appService.getLoadingStatus();
  }
}
