import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';

interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
  fingerprintSha256: string;
  tokenLast4: string;
}

@Injectable()
export class SecretCryptoService {
  private readonly currentVersion: string;
  private readonly keys: Record<string, Buffer>;

  constructor() {
    this.currentVersion = process.env.APP_MASTER_KEY_CURRENT_VERSION || 'v1';
    this.keys = this.loadKeys();
  }

  private loadKeys(): Record<string, Buffer> {
    const fromFile = process.env.APP_MASTER_KEYS_FILE;
    let raw = '{}';

    if (fromFile && existsSync(fromFile)) {
      raw = readFileSync(fromFile, 'utf8');
    } else if (process.env.APP_MASTER_KEYS_JSON) {
      raw = process.env.APP_MASTER_KEYS_JSON;
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    const mapped = Object.fromEntries(
      Object.entries(parsed).map(([version, base64Key]) => [version, Buffer.from(base64Key, 'base64')])
    );

    if (!mapped[this.currentVersion]) {
      throw new InternalServerErrorException('APP_MASTER_KEY_CURRENT_VERSION nao possui chave correspondente.');
    }

    return mapped;
  }

  encrypt(value: string): EncryptedSecret {
    const key = this.keys[this.currentVersion];
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: this.currentVersion,
      fingerprintSha256: createHash('sha256').update(value).digest('hex'),
      tokenLast4: value.slice(-4)
    };
  }

  decrypt(input: { ciphertext: string; iv: string; authTag: string; keyVersion: string }): string {
    const key = this.keys[input.keyVersion];
    if (!key) {
      throw new InternalServerErrorException(`Chave ${input.keyVersion} nao encontrada.`);
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(input.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(input.ciphertext, 'base64')),
      decipher.final()
    ]);

    return plaintext.toString('utf8');
  }
}
