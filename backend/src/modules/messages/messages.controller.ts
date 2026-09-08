import { Controller } from '@nestjs/common';
import { MessagesService } from './messages.service.js';

@Controller('api/v1')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // TODO: Implement endpoint handlers
}
