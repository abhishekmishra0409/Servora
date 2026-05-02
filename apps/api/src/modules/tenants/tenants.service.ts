import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Tenant } from '../../database/schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(@InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>) {}

  async list(): Promise<Tenant[]> {
    return this.tenantModel.find().sort({ createdAt: -1 }).lean().exec();
  }
}

