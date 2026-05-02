import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Branch } from '../../database/schemas/branch.schema';
import { UpdateBranchDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(@InjectModel(Branch.name) private readonly branchModel: Model<Branch>) {}

  async list(tenantId: string): Promise<Branch[]> {
    return this.branchModel.find({ tenantId }).sort({ name: 1 }).lean().exec();
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.branchModel.findByIdAndUpdate(id, dto, { returnDocument: 'after' }).exec();
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }
}
