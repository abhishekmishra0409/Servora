import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Server, Socket } from 'socket.io';

import { Order } from '../../../database/schemas/order.schema';
import { SocketAuthService } from '../socket-auth.service';
import { staffCanAccessRecord } from '../room-access';

@WebSocketGateway()
export class OrderGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  @SubscribeMessage('join.order')
  async joinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { orderId: string },
  ): Promise<{ joined: boolean; room: string }> {
    const user = this.socketAuthService.authenticateClient(client);

    const order = await this.orderModel
      .findById(payload.orderId)
      .select('tenantId branchId tableSessionId')
      .lean()
      .exec();

    if (!order) {
      throw new WsException('Order access denied');
    }

    const allowed =
      user.type === 'guest'
        ? String(order.tableSessionId) === user.tableSessionId
        : staffCanAccessRecord(user, order);

    if (!allowed) {
      throw new WsException('Order access denied');
    }

    const room = `order:${payload.orderId}`;
    void client.join(room);
    return { joined: true, room };
  }
}
