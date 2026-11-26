import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CatalogService, type CatalogActor } from './catalog.service.js';

@Controller('api/v1/catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get(':kind')
  page(
    @Param('kind') kind: string,
    @Req() request: { user: CatalogActor },
    @Query() filters: Record<string, string>,
  ) {
    return this.catalog.page(kind, request.user, filters);
  }
}
