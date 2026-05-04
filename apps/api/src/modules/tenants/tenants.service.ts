import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { StaffJwtPayload } from '@restaurent/shared';
import { UserRole } from '@restaurent/shared';
import { Model } from 'mongoose';

import { Tenant } from '../../database/schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(@InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>) {}

  async list(user: StaffJwtPayload): Promise<Tenant[]> {
    if (user.role !== UserRole.PlatformAdmin) {
      return this.tenantModel.find({ _id: user.tenantId }).sort({ createdAt: -1 }).lean().exec();
    }
    return this.tenantModel.find().sort({ createdAt: -1 }).lean().exec();
  }
}
