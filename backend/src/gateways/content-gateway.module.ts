import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentGateway } from './content.gateway.js';
import { MockContentGateway } from './mock-content.gateway.js';
import { HttpContentGateway } from './http-content.gateway.js';

@Global()
@Module({
  providers: [
    MockContentGateway,
    HttpContentGateway,
    {
      provide: ContentGateway,
      useFactory: (
        configService: ConfigService,
        mockGateway: MockContentGateway,
        httpGateway: HttpContentGateway,
      ) => {
        const gatewayType = configService.get<string>('CONTENT_GATEWAY_TYPE', 'mock');
        return gatewayType === 'http' ? httpGateway : mockGateway;
      },
      inject: [ConfigService, MockContentGateway, HttpContentGateway],
    },
  ],
  exports: [ContentGateway],
})
export class ContentGatewayModule {}
