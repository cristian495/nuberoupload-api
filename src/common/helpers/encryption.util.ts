import crypto from "node:crypto"

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

// export function encrypt(text: string) {
//   const iv = crypto.randomBytes(IV_LENGTH);
//   const cipher = crypto.createCipheriv(
//     'aes-256-cbc',
//     Buffer.from(ENCRYPTION_KEY),
//     iv,
//   );
//   let encrypted = cipher.update(text);
//   encrypted = Buffer.concat([encrypted, cipher.final()]);
//   return iv.toString('hex') + ':' + encrypted.toString('hex');
// }

// export function decrypt(text: string) {
//   const [ivHex, encryptedTextHex] = text.split(':');
//   const iv = Buffer.from(ivHex, 'hex');
//   const encryptedText = Buffer.from(encryptedTextHex, 'hex');
//   const decipher = crypto.createDecipheriv(
//     'aes-256-cbc',
//     Buffer.from(ENCRYPTION_KEY),
//     iv,
//   );
//   let decrypted = decipher.update(encryptedText);
//   decrypted = Buffer.concat([decrypted, decipher.final()]);
//   return decrypted.toString();
// }
