import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AttachmentsService, AttachmentView } from './attachments.service';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
]);
const MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
      }),
      limits: { fileSize: MAX_BYTES },
      fileFilter: (_req, file, cb) =>
        ALLOWED_MIME.has(file.mimetype)
          ? cb(null, true)
          : cb(
              new BadRequestException(
                `Unsupported mime type: ${file.mimetype}`,
              ),
              false,
            ),
    }),
  )
  upload(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtUser,
  ): Promise<AttachmentView> {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }
    return this.service.addAttachment(ticketId, file, user.sub);
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  async remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    await this.service.removeAttachment(ticketId, attachmentId, user.sub);
  }
}
