import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class OrderGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join.order')
  joinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string },
  ): { joined: boolean; room: string } {
    const room = `order:${payload.orderId}`;
    void client.join(room);
    return { joined: true, room };
  }
}
