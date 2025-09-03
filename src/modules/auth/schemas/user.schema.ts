import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false }) // No requerido para OAuth
  password?: string;

  @Prop({ 
    type: String, 
    enum: Object.values(AuthProvider), 
    default: AuthProvider.LOCAL 
  })
  provider: AuthProvider;

  @Prop({ required: false }) // ID del proveedor OAuth
  providerId?: string;

  @Prop({ required: false })
  avatar?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ required: false })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índices para optimización
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ providerId: 1, provider: 1 });