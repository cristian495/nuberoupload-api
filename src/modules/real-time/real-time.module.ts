import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { WsEmitterService } from './ws-emitter.service';

@Module({
  providers: [AppGateway, WsEmitterService],
  exports: [WsEmitterService], // 👈 Exportamos el emisor
})
export class RealTimeModule {}
