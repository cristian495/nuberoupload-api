import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ProviderTemplatesService } from './provider-templates.service';
import { ProviderTemplate } from './schemas/provider-template.schema';
import { CreateProviderTemplateDto } from './dto/create-provider-template.dto';
import { UpdateProviderTemplateDto } from './dto/update-provider-template.dto';

@Controller('provider-templates')
export class ProviderTemplatesController {
  constructor(private providerTemplatesService: ProviderTemplatesService) {}

  @Get()
  async findAll(): Promise<ProviderTemplate[]> {
    return this.providerTemplatesService.findAll();
  }

  @Get('available-codes')
  async getAvailableProviderCodes(): Promise<{ codes: string[] }> {
    const codes = this.providerTemplatesService.getAvailableProviderCodes();
    return { codes };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProviderTemplate | null> {
    return this.providerTemplatesService.findOneById(id);
  }

  @Post()
  async create(@Body() createProviderTemplateDto: CreateProviderTemplateDto): Promise<ProviderTemplate> {
    return this.providerTemplatesService.create(createProviderTemplateDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProviderTemplateDto: UpdateProviderTemplateDto
  ): Promise<ProviderTemplate | null> {
    return this.providerTemplatesService.update(id, updateProviderTemplateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.providerTemplatesService.remove(id);
    return { success };
  }
}