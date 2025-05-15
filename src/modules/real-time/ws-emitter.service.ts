import { Injectable } from '@nestjs/common';
import { AppGateway } from './app.gateway';

@Injectable()
export class WsEmitterService {
  constructor(private readonly gateway: AppGateway) {}

  emit(event: string, payload: any) {
    this.gateway.emitToAll(event, payload);
  }

  emitToClient(clientId: string, event: string, payload: any) {
    this.gateway.emitToClient(clientId, event, payload);
  }
}
