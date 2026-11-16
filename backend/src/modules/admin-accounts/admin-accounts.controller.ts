import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminAccountsService } from './admin-accounts.service.js';
import { AccountStatusDto, CreateContentManagerDto, ListAdminAccountsDto, UpdateAdminAccountDto } from './dto/admin-account.dto.js';

@Controller('api/v1/admin/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAccountsController {
  constructor(private readonly service: AdminAccountsService) {}
  @Get()
  list(@Query() query: ListAdminAccountsDto) { return this.service.list(query); }
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) { return this.service.detail(id); }
  @Post()
  create(@Body() dto: CreateContentManagerDto, @Req() req: { user: { id: string } }) {
    return this.service.create(dto, req.user.id);
  }
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdminAccountDto,
    @Req() req: { user: { id: string } }) { return this.service.update(id, dto, req.user.id); }
  @Patch(':id/status')
  status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AccountStatusDto,
    @Req() req: { user: { id: string } }) { return this.service.setStatus(id, dto, req.user.id); }
}
