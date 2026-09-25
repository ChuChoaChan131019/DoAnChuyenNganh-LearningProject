import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService, CreateNoteDto, UpdateNoteDto } from './notes.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@Controller('api/v1/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async findAll(@Request() req: any, @Query() query: { lessonId?: string; search?: string }) {
    const userId = req.user.id;
    return this.notesService.findAll(userId, {
      lessonId: query.lessonId,
      search: query.search,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.id;
    return this.notesService.findOne(id, userId);
  }

  @Post()
  async create(@Request() req: any, @Body() createNoteDto: CreateNoteDto) {
    const userId = req.user.id;
    return this.notesService.create(userId, createNoteDto);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    const userId = req.user.id;
    return this.notesService.update(id, userId, updateNoteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user.id;
    await this.notesService.delete(id, userId);
  }
}
