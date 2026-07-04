import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  // select:false → never loaded by queries unless explicitly `.select('+field')`.
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ default: true })
  active!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Defense in depth: even a freshly-created/hydrated doc must never serialize
// secret fields into an API response body.
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>;
    delete record.passwordHash;
    delete record.refreshTokenHash;
  },
});

