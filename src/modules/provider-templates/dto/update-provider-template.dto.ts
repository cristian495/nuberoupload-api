import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderTemplateDto } from './create-provider-template.dto';

export class UpdateProviderTemplateDto extends PartialType(CreateProviderTemplateDto) {}