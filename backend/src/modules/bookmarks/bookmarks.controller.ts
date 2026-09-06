import { Controller } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service.js';

@Controller('api/v1/bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  // TODO: Implement endpoint handlers
}
