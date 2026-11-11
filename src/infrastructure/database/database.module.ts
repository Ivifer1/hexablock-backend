import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { readDatabaseUri } from '../config/database.config.js';

// Opens the MongoDB connection (ADR-0001). Only infrastructure and the
// repository adapters know Mongoose; use cases depend on repository ports.
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: readDatabaseUri(process.env) }),
    }),
  ],
})
export class DatabaseModule {}
