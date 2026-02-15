/**
 * iZettle Token Encryption Service
 * 
 * This service provides encryption/decryption for iZettle tokens.
 * Kept for backwards compatibility with existing encrypted data.
 */

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.JWT_SECRET || "default-encryption-key-change-me";

/**
 * Encrypt a token for secure storage
 */
export function encryptToken(token: string): string {
  const algorithm = "aes-256-gcm";
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Return iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a stored token
 */
export function decryptToken(encryptedData: string): string {
  const algorithm = "aes-256-gcm";
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
