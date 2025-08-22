import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProviderTemplate } from './schemas/provider-template.schema';
import { ProviderRegistryService } from '../provider-registry/provider-registry.service';

@Injectable()
export class ProviderTemplatesService {
  constructor(
    @InjectModel(ProviderTemplate.name)
    private providerTemplateModel: Model<ProviderTemplate>,
    private providerRegistry: ProviderRegistryService,
  ) {}

  async findAll(): Promise<ProviderTemplate[]> {
    return this.providerTemplateModel.find().exec();
  }

  async findOneById(id: string): Promise<ProviderTemplate | null> {
    return this.providerTemplateModel.findById(id).exec();
  }

  async findByAvailableCodes(codes: string[]): Promise<ProviderTemplate[]> {
    return this.providerTemplateModel.find({
      code: { $in: codes }
    }).exec();
  }

  async create(
    providerTemplate: Partial<ProviderTemplate>,
  ): Promise<ProviderTemplate> {
    // Validar que el código del template corresponda a un provider disponible
    if (providerTemplate.code && !this.providerRegistry.isProviderAvailable(providerTemplate.code)) {
      throw new BadRequestException(
        `Cannot create template for provider with code '${providerTemplate.code}' - service not implemented`
      );
    }

    const created = new this.providerTemplateModel(providerTemplate);
    return created.save();
  }

  async update(
    id: string,
    updateData: Partial<ProviderTemplate>,
  ): Promise<ProviderTemplate | null> {
    // Validar que el código del template (si se está actualizando) corresponda a un provider disponible
    if (updateData.code && !this.providerRegistry.isProviderAvailable(updateData.code)) {
      throw new BadRequestException(
        `Cannot update template to provider with code'${updateData.code}' - service not implemented`
      );
    }

    return this.providerTemplateModel
      .findOneAndUpdate({ _id: id }, updateData, { new: true })
      .exec();
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.providerTemplateModel.deleteOne({ id }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Obtiene los códigos de providers que tienen servicio implementado
   * Útil para mostrar solo opciones válidas al crear templates
   */
  getAvailableProviderCodes(): string[] {
    return this.providerRegistry.getAvailableProviderCodes();
  }
}
