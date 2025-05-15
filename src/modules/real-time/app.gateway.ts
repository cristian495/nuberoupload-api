import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
const logger = new Logger('WebSocketGateway');

@WebSocketGateway({ cors: true })
export class AppGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  emitToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }

  afterInit(server: Server) {
    logger.log('WebSocket server initialized');
    server.on('connection', (socket) => {
      logger.log(`Client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        logger.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
