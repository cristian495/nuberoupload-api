import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, ObjectId } from 'mongoose';

@Schema({ timestamps: true, collection: 'storage_providers' })
export class StorageProvider extends Document<ObjectId> {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  name: string; // Ej: "Doodstream", "Cloudinary"

  @Prop({ required: true })
  code: string; // Ej: "doodstream", "cloudinary"

  @Prop({ required: true })
  templateId: string; // Referencia al ProviderTemplate usado

  @Prop({})
  description?: string; // Ej: "Especializado en imágenes", "Especializado en videos"

  @Prop({ type: Object, required: true })
  config: Record<string, any>;

  @Prop({ type: Object, required: true })
  configLastChars: Record<string, any>;

  @Prop({ type: [String], default: [] })
  supportedExtensions: string[]; // [".jpg", ".png", ".mp4"] 

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  lastConnectionCheck?: Date;

  @Prop({ default: null })
  isConnectionHealthy?: boolean;

  @Prop({ default: null })
  connectionError?: string;
}

export const StorageProviderSchema =
  SchemaFactory.createForClass(StorageProvider);
