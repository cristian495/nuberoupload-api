import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FileCategory, FILE_EXTENSIONS } from '../../../common/constants/file-extensions';

@Schema({ timestamps: true, collection: 'files' })
export class FileItem extends Document<Types.ObjectId> {
  @Prop({ required: true })
  originalName: string;

  @Prop({ type: Types.ObjectId, ref: 'Folder', required: true })
  folderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: [
      {
        providerCode: { type: String, required: true },
        providerId: { type: String, required: true },
        url: { type: String, required: true },
        thumbnail: { type: String },
        metadata: { type: Object, default: {} },
      },
    ],
    default: [],
  })
  uploads: {
    providerCode: string;
    providerId: string;
    url: string;
    thumbnail: string;
    metadata: Record<string, any>;
  }[];

  @Prop({ required: true, enum: Object.values(FileCategory) })
  category: FileCategory;

  @Prop({ default: 'pending', enum: ['pending', 'completed', 'failed'] })
  status: 'pending' | 'completed' | 'failed';

  @Prop() errorMessage?: string;
}

export const FileItemSchema = SchemaFactory.createForClass(FileItem);
