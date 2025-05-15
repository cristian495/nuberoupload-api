import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MediaItem extends Document {
  @Prop({ required: true, unique: true })
  uploadId: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaFolder', required: true })
  folderId: Types.ObjectId;

  @Prop({
    type: [
      {
        provider: { type: String },
        url: { type: String },
        thumbnail: { type: String },
      },
    ],
    default: [],
  })
  providers: { provider: string; url: string; thumbnail: string }[];

  @Prop({ required: true, enum: ['image', 'video'] })
  type: 'image' | 'video';

  @Prop({ default: 'pending', enum: ['pending', 'completed', 'failed'] })
  status: 'pending' | 'completed' | 'failed';

  @Prop() errorMessage?: string;
}

export const MediaItemSchema = SchemaFactory.createForClass(MediaItem);
