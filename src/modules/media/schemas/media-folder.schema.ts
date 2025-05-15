import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MediaFolder extends Document {
  @Prop({ required: true, unique: true })
  name: string;
}

export const MediaFolderSchema = SchemaFactory.createForClass(MediaFolder);
