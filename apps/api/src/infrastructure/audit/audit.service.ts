import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AuditLog } from '../../database/schemas/audit-log.schema';

export interface AuditEntry {
  action: string;
  branchId?: string | undefined;
  entityId: string;
  entityType: string;
  payload?: Record<string, unknown>;
  tenantId: string;
  actorUserId?: string | undefined;
}

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>) {}

  async record(entry: AuditEntry): Promise<void> {
    const document: Record<string, unknown> = {
      action: entry.action,
      entityId: entry.entityId,
      entityType: entry.entityType,
      payload: entry.payload ?? {},
      tenantId: entry.tenantId,
    };

    if (entry.actorUserId) {
      document.actorUserId = entry.actorUserId;
    }
    if (entry.branchId) {
      document.branchId = entry.branchId;
    }

    await this.auditModel.create(document);
  }

  list(tenantId: string, branchId?: string): Promise<AuditLog[]> {
    return this.auditModel
      .find({ tenantId, ...(branchId ? { branchId } : {}) })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }
}
