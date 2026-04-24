import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

@Controller('screenshots')
export class ScreenshotsController {
  @Get(':fileName')
  async getScreenshot(@Param('fileName') fileName: string, @Res() res: Response) {
    const baseDir = process.env.SCREENSHOTS_DIR || '/app/apps/api/storage/screenshots';
    const fullPath = join(baseDir, fileName);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('Screenshot não encontrada.');
    }

    return res.sendFile(fullPath);
  }
}
