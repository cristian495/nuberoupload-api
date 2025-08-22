import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FileCategory, FILE_EXTENSIONS } from '../../../common/constants/file-extensions';

@Schema({ timestamps: true, collection: 'files' })
export class FileItem extends Document {
  @Prop({ required: true, unique: true })
  uploadId: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ type: Types.ObjectId, ref: 'Folder', required: true })
  folderId: Types.ObjectId;

  @Prop({
    type: [
      {
        // provider: { type: String },
        url: { type: String },
        thumbnail: { type: String },
        code: { type: String },
        name: { type: String },
        _id: { type: String },
      },
    ],
    default: [],
  })
  providers: {
    code: string;
    url: string;
    thumbnail: string;
    name: string;
    _id: string;
  }[];

  @Prop({ required: true, enum: Object.values(FileCategory) })
  category: FileCategory;

  @Prop({ default: 'pending', enum: ['pending', 'completed', 'failed'] })
  status: 'pending' | 'completed' | 'failed';

  @Prop() errorMessage?: string;
}

export const FileItemSchema = SchemaFactory.createForClass(FileItem);
