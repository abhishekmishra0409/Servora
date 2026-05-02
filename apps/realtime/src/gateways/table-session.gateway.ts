import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { SocketAuthService } from '../auth/socket-auth.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TableSessionGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly socketAuthService: SocketAuthService) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth.token as string | undefined;
    const user = this.socketAuthService.authenticate(token);
    const branchId = 'branchId' in user ? user.branchId : user.branchId;

    if (branchId) {
      void client.join(`branch:${branchId}`);
    }

    if ('tableSessionId' in user) {
      void client.join(`tableSession:${user.tableSessionId}`);
    }

    void client.join(`tenant:${user.tenantId}`);
  }

  @SubscribeMessage('join.table-session')
  joinTableSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tableSessionId: string },
  ): { joined: boolean; room: string } {
    const room = `tableSession:${payload.tableSessionId}`;
    void client.join(room);
    return { joined: true, room };
  }
}

