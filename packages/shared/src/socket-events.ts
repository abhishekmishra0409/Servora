import type { OrderStatus, ServiceRequestStatus } from './enums';

export const SOCKET_EVENTS = {
  bucketItemAdded: 'bucket.item_added',
  bucketItemRemoved: 'bucket.item_removed',
  bucketItemUpdated: 'bucket.item_updated',
  bucketLocked: 'bucket.locked',
  kitchenTicketUpdated: 'kitchen.ticket_updated',
  orderCreated: 'order.created',
  orderStatusUpdated: 'order.status_updated',
  participantJoined: 'participant.joined',
  participantLeft: 'participant.left',
  serviceRequestAssigned: 'service_request.assigned',
  serviceRequestCreated: 'service_request.created',
  serviceRequestResolved: 'service_request.resolved',
} as const;

export interface ParticipantJoinedPayload {
  alias: string;
  participantId: string;
  tableSessionId: string;
}

export interface BucketDeltaPayload {
  itemId: string;
  quantity: number;
  tableSessionId: string;
  total: number;
}

export interface OrderStatusPayload {
  orderId: string;
  status: OrderStatus;
}

export interface ServiceRequestPayload {
  requestId: string;
  status: ServiceRequestStatus;
  tableId: string;
}

