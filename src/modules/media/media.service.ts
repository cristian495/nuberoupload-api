import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MediaItem } from './schemas/media-item.schema';
import { MediaFolder } from './schemas/media-folder.schema';
import { Model, Types } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(MediaItem.name) private itemModel: Model<MediaItem>,
    @InjectModel(MediaFolder.name) private folderModel: Model<MediaFolder>,
  ) {}

  async createUploadId(): Promise<string> {
    let id: string;
    let exists = true;
    do {
      id = uuid();
      exists = !!(await this.itemModel.exists({ uploadId: id }));
    } while (exists);
    return id;
  }

  async saveFile(
    uploadId: string,
    originalName: string,
    folderName: string,
    type: 'image' | 'video',
  ) {
    const folder = await this.folderModel.findOneAndUpdate(
      { name: folderName },
      { name: folderName },
      { upsert: true, new: true },
    );

    const item = await new this.itemModel({
      uploadId,
      originalName,
      folderId: folder._id,
      providers: [],
      type,
      status: 'pending',
    }).save();

    return { item, folder };
  }

  async addProviderLink(
    uploadId: string,
    provider: string,
    url: string,
    thumbnail: string,
  ) {
    await this.itemModel.updateOne(
      { uploadId },
      {
        $push: { providers: { provider, url, thumbnail } },
        $set: { status: 'completed' },
      },
    );
  }

  async markUploadFailed(uploadId: string, error: string) {
    await this.itemModel.updateOne(
      { uploadId },
      {
        $set: {
          status: 'failed',
          errorMessage: error,
        },
      },
    );
  }

  async listFolders() {
    const folders = await this.folderModel.find().lean();

    const mediaData = await this.itemModel.aggregate([
      {
        $group: {
          _id: '$folderId',
          total: { $sum: 1 },
          imageCount: {
            $sum: {
              $cond: [{ $eq: ['$type', 'image'] }, 1, 0],
            },
          },
          videoCount: {
            $sum: {
              $cond: [{ $eq: ['$type', 'video'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const thumbs = await this.itemModel.aggregate([
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$folderId',
          thumbnail: { $first: '$providers.thumbnail' },
        },
      },
      {
        $project: {
          _id: 1,
          thumbnail: { $arrayElemAt: ['$thumbnail', 0] },
        },
      },
    ]);

    const statsMap = Object.fromEntries(
      mediaData.map((d) => [d._id.toString(), d]),
    );
    const thumbMap = Object.fromEntries(
      thumbs.map((t) => [t._id.toString(), t.thumbnail]),
    );

    return folders.map((folder) => {
      const fid = folder._id.toString();
      return {
        ...folder,
        count: statsMap[fid]?.total || 0,
        imageCount: statsMap[fid]?.imageCount || 0,
        videoCount: statsMap[fid]?.videoCount || 0,
        thumbnail: thumbMap[fid] || null,
      };
    });
  }

  async getFolderById(folderId: string) {
    const files = await this.itemModel
      .find({ folderId: new Types.ObjectId(folderId) })
      .lean();

    const folder = await this.folderModel.findById(folderId).lean();

    if (!folder) {
      throw new Error('Folder not found');
    }

    const firstFile = await this.itemModel
      .findOne({ folderId: new Types.ObjectId(folderId) })
      .sort({ createdAt: -1 })
      .lean();

    const imageCount = await this.itemModel.countDocuments({ type: 'image' });

    const videoCount = await this.itemModel.countDocuments({ type: 'video' });

    return {
      ...folder,
      thumbnail: firstFile?.providers[0].thumbnail,
      imageCount,
      videoCount,
    };
  }

  async getFolderFiles(folderId: string, type?: 'image' | 'video') {
    let query = { folderId: new Types.ObjectId(folderId), status: 'completed' };
    if (type) {
      query['type'] = type;
    }

    const files = await this.itemModel.find(query).lean();

    if (!files) {
      throw new Error('Files not found');
    }

    return files;
  }
}
