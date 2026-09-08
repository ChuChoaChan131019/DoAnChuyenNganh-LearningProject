import { Controller } from '@nestjs/common';
import { NotesService } from './notes.service.js';

@Controller('api/v1/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  // TODO: Implement endpoint handlers
}
