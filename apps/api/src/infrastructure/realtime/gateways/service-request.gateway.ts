import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { SocketAuthService } from '../socket-auth.service';

@WebSocketGateway()
export class ServiceRequestGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly socketAuthService: SocketAuthService) {}

  @SubscribeMessage('join.staff')
  joinStaffRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() _payload: { userId: string },
  ): { joined: boolean; room: string } {
    const user = this.socketAuthService.authenticateClient(client);

    if (user.type !== 'staff') {
      throw new WsException('Staff access required');
    }

    // A staff socket may only join its OWN staff room, regardless of the
    // requested userId — this closes the cross-user room-join leak.
    const room = `staff:${user.sub}`;
    void client.join(room);
    return { joined: true, room };
  }
}
