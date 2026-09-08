import { Controller } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Controller('api/v1')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // TODO: Implement endpoint handlers
}
