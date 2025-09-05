import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class CredentialField {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true, enum: ['text', 'password', 'select', 'textarea'] })
  type: 'text' | 'password' | 'select' | 'textarea';

  @Prop()
  placeholder?: string;

  @Prop({ default: false })
  required: boolean;

  @Prop()
  description?: string;

  @Prop()
  defaultValue?: string;

  @Prop({
    type: [
      {
        value: { type: String, required: true },
        label: { type: String, required: true },
      },
    ],
    default: [],
  })
  options?: { value: string; label: string }[];
}

export const CredentialFieldSchema =
  SchemaFactory.createForClass(CredentialField);

@Schema({ timestamps: true, collection: 'provider_templates' })
export class ProviderTemplate extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: [String], default: [] })
  supportedExtensions: string[];

  @Prop()
  description: string;

  @Prop({ type: [CredentialFieldSchema], default: [] })
  fields: CredentialField[];
}

export const ProviderTemplateSchema =
  SchemaFactory.createForClass(ProviderTemplate);
