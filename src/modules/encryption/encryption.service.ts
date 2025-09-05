import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionConfig } from 'src/config/encryption.config';
import crypto from 'node:crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly ivLength = 16;

  constructor(private readonly configService: ConfigService) {
    const key =
      configService.get<EncryptionConfig>('encryption')!.encryptionKey;

    if (!key || key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters');
    }

    this.key = Buffer.from(key);
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(encryptedText: string): string {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Desencripta toda la configuración de un proveedor
   */
  decryptProviderConfig(encryptedConfig: Record<string, any>): Record<string, any> {
    const decryptedConfig: Record<string, any> = {};

    for (const [key, encryptedValue] of Object.entries(encryptedConfig)) {
      decryptedConfig[key] = this.decrypt(encryptedValue);
    }

    return decryptedConfig;
  }
}
