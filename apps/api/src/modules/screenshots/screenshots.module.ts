import { Module } from '@nestjs/common';
import { ScreenshotsController } from './screenshots.controller';

@Module({
  controllers: [ScreenshotsController]
})
export class ScreenshotsModule {}
