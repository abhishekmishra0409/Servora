import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ServiceRequestGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('join.staff')
  joinStaffRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ): { joined: boolean; room: string } {
    const room = `staff:${payload.userId}`;
    void client.join(room);
    return { joined: true, room };
  }
}

