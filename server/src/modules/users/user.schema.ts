import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** MongoDB is the source of truth for users. `passwordHash` never leaves the API. */
@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User {
  /** E.164, unique. */
  @Prop({ required: true, type: String, unique: true, index: true })
  phone!: string;

  /** Derived from `phone`; enables substring search over digits only. */
  @Prop({ required: true, type: String, index: true })
  phoneDigits!: string;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ required: true, type: String })
  passwordHash!: string;

  @Prop({ required: true, type: Boolean, default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
