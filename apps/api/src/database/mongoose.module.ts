import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { createMongooseOptions } from './mongoose.config';
import { databaseModels } from './schemas';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createMongooseOptions,
    }),
    MongooseModule.forFeature(databaseModels),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}

