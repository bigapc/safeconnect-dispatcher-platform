import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import jwt from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';
import { academyEvents } from '@safeconnect/academy';

interface SocketJwtPayload {
  sub: string;
  orgId: string | null;
  role: string;
  tokenType: 'access' | 'refresh';
}

@WebSocketGateway({
  namespace: 'dispatch',
  cors: {
    origin: process.env.APP_URL,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    const authHeader = client.handshake.headers.authorization;
    const handshakeToken = typeof client.handshake.auth.token === 'string' ? client.handshake.auth.token : null;
    const rawToken = handshakeToken ?? (typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : null);

    if (!rawToken) {
      client.disconnect(true);
      return;
    }

    try {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (!secret) {
        client.disconnect(true);
        return;
      }

      const decoded = jwt.verify(rawToken, secret) as SocketJwtPayload;
      client.data.userId = decoded.sub;
      client.data.orgId = decoded.orgId;
      client.data.role = decoded.role;

      if (decoded.orgId) {
        client.join(this.organizationRoom(decoded.orgId));
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {}

  @SubscribeMessage('join.organization')
  onJoinOrganization(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { organizationId: string },
  ) {
    client.join(this.organizationRoom(payload.organizationId));
    return { joined: true };
  }

  @SubscribeMessage('gps:update')
  onGpsUpdate(@MessageBody() payload: { courierId: string; latitude: number; longitude: number }) {
    this.server.emit('gps:updated', payload);
    return { delivered: true };
  }

  emitAssignmentCreated(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit('assignment.created', {
      organizationId,
      data: payload,
    });
  }

  emitAssignmentUpdated(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit('assignment.updated', {
      organizationId,
      data: payload,
    });
  }

  emitAssignmentAssigned(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit('assignment.assigned', {
      organizationId,
      data: payload,
    });
  }

  emitAssignmentStatusChanged(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit('assignment.status_changed', {
      organizationId,
      data: payload,
    });
  }

  emitAssignmentCompleted(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit('assignment.completed', {
      organizationId,
      data: payload,
    });
  }

  emitCourierLocationUpdated(organizationId: string, payload: unknown): void {
    const payloadValue = payload as Record<string, unknown>;

    this.server.to(this.organizationRoom(organizationId)).emit('courier.location_updated', {
      ...payloadValue,
      organizationId,
    });

    this.server.to(this.organizationRoom(organizationId)).emit('courier.location.updated', {
      ...payloadValue,
      organizationId,
    });
  }

  emitCourierStatusChanged(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit('courier.status_changed', {
      organizationId,
      data: payload,
    });
  }

  emitNotificationCreated(organizationId: string, payload: unknown, userId: string | null = null): void {
    this.server.to(this.organizationRoom(organizationId)).emit('notification.created', {
      organizationId,
      userId,
      data: payload,
    });
  }

  emitAcademyCourseCompleted(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit(academyEvents.courseCompleted, {
      organizationId,
      data: payload,
    });
  }

  emitAcademyCertificateIssued(organizationId: string, payload: unknown): void {
    this.server.to(this.organizationRoom(organizationId)).emit(academyEvents.certificateIssued, {
      organizationId,
      data: payload,
    });
  }

  private organizationRoom(organizationId: string): string {
    return `organization:${organizationId}`;
  }
}
