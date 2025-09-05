import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileItem } from './schemas/file-item.schema';
import { Folder } from './schemas/folder.schema';
import { Model, Types } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { StorageProvider } from '../storage-providers/schemas/storage-provider.schema';
import { FileCategory } from '../../common/constants/file-extensions';
import { StorageProvidersService } from '../storage-providers/storage-providers.service';
import { EncryptionService } from '../encryption/encryption.service';
import { UploadResult } from '../../common/types/upload-result';

interface FileCreationData {
  userId: string;
  originalName: string;
  folderName: string;
  fileCategory: FileCategory;
}

interface UploadResultData {
  fileId: string;
  provider: StorageProvider;
  downloadUrl: string;
  thumbnailUrl: string;
  metadata?: Record<string, any>; // Metadata específica del provider
}

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileItem.name) private fileItemModel: Model<FileItem>,
    @InjectModel(Folder.name) private folderModel: Model<Folder>,
    private storageProvidersService: StorageProvidersService,
    private encryptionService: EncryptionService,
  ) {}

  // 🎯 FILE RECORD MANAGEMENT

  async createFileRecord(data: FileCreationData) {
    const { userId, originalName, folderName, fileCategory } = data;

    const targetFolder = await this.ensureFolderExists(folderName);

    const file = await new this.fileItemModel({
      userId,
      originalName,
      folderId: targetFolder._id,
      uploads: [],
      category: fileCategory,
      status: 'pending',
    }).save();

    return { file, folder: targetFolder };
  }

  // 🎯 UPLOAD RESULT MANAGEMENT

  /**
   * Registra el resultado exitoso de un upload sin distorsión de parámetros
   * Método más directo y legible que addUploadResult
   */
  async addUploadResult(
    fileId: string,
    uploadResult: UploadResult,
  ): Promise<void> {
    await this.fileItemModel.updateOne(
      { _id: fileId },
      {
        $push: {
          uploads: {
            providerCode: uploadResult.providerCode,
            providerId: uploadResult.providerId,
            url: uploadResult.url,
            thumbnail: uploadResult.metadata.thumbnail || '',
            metadata: uploadResult.metadata,
          },
        },
        $set: { status: 'completed' },
      },
    );
  }

  async markFileUploadAsFailed(
    fileId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.fileItemModel.updateOne(
      { _id: fileId },
      {
        $set: {
          status: 'failed',
          errorMessage,
        },
      },
    );
  }

  // 🎯 FOLDER OPERATIONS
  private async ensureFolderExists(folderName: string) {
    return this.folderModel.findOneAndUpdate(
      { name: folderName },
      { name: folderName },
      { upsert: true, new: true },
    );
  }

  async getAllFoldersWithStats() {
    const allFolders = await this.folderModel.find().lean();
    const fileStatsByFolder = await this.calculateFileStatsByFolder();
    const thumbnailsByFolder = await this.getLatestThumbnailsByFolder();

    return allFolders.map((folder) => {
      const folderId = folder._id.toString();
      const stats = fileStatsByFolder[folderId];

      return {
        ...folder,
        totalFiles: stats?.total || 0,
        imageCount: stats?.imageCount || 0,
        videoCount: stats?.videoCount || 0,
        thumbnail: thumbnailsByFolder[folderId] || null,
      };
    });
  }

  private async calculateFileStatsByFolder() {
    const aggregationResult = await this.fileItemModel.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$folderId',
          total: { $sum: 1 },
          imageCount: {
            $sum: { $cond: [{ $eq: ['$category', FileCategory.IMAGE] }, 1, 0] },
          },
          videoCount: {
            $sum: { $cond: [{ $eq: ['$category', FileCategory.VIDEO] }, 1, 0] },
          },
        },
      },
    ]);

    return Object.fromEntries(
      aggregationResult.map((stats) => [stats._id.toString(), stats]),
    );
  }

  private async getLatestThumbnailsByFolder() {
    const thumbnailResults = await this.fileItemModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$folderId',
          latestThumbnail: { $first: '$uploads.thumbnail' },
        },
      },
      {
        $project: {
          _id: 1,
          latestThumbnail: { $arrayElemAt: ['$latestThumbnail', 0] },
        },
      },
    ]);

    return Object.fromEntries(
      thumbnailResults.map((result) => [
        result._id.toString(),
        result.latestThumbnail,
      ]),
    );
  }

  // 🎯 FOLDER QUERIES
  async getFolderDetailsById(folderId: string) {
    const folderObjectId = new Types.ObjectId(folderId);

    const folder = await this.folderModel.findById(folderId).lean();
    if (!folder) {
      throw new Error(`Folder with ID ${folderId} not found`);
    }

    const [folderFiles, latestFile, globalImageCount, globalVideoCount] =
      await Promise.all([
        this.fileItemModel.find({ folderId: folderObjectId }).lean(),
        this.fileItemModel
          .findOne({ folderId: folderObjectId })
          .sort({ createdAt: -1 })
          .lean(),
        this.fileItemModel.countDocuments({ category: FileCategory.IMAGE }),
        this.fileItemModel.countDocuments({ category: FileCategory.VIDEO }),
      ]);

    return {
      ...folder,
      files: folderFiles,
      thumbnail: latestFile?.uploads[0]?.thumbnail || null,
      globalStats: {
        totalImages: globalImageCount,
        totalVideos: globalVideoCount,
      },
    };
  }

  async getFilesInFolder(folderId: string, fileCategory?: FileCategory) {
    const queryConditions: any = {
      folderId: new Types.ObjectId(folderId),
      status: 'completed',
    };

    if (fileCategory) {
      queryConditions.category = fileCategory;
    }

    const files = await this.fileItemModel.find(queryConditions).lean();

    if (!files || files.length === 0) {
      return [];
    }

    return files;
  }

  // 🎯 STREAMING SUPPORT
  async getFileById(fileId: string): Promise<FileItem | null> {
    return this.fileItemModel.findById(fileId).populate('folderId').lean();
  }

  async getProviderConfig(providerId: string): Promise<Record<string, any>> {
    const provider = await this.storageProvidersService.findById(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    return this.encryptionService.decryptProviderConfig(provider.config);
  }

  // 🎯 ELIMINACIÓN DE UPLOADS
  async removeUploadFromFile(
    fileId: string,
    providerId: string,
  ): Promise<void> {
    await this.fileItemModel.updateOne(
      { _id: fileId },
      {
        $pull: {
          uploads: { providerId: providerId },
        },
      },
    );
  }
}
