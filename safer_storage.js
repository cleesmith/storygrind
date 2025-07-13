// safer_storage.js 
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

class SaferStorage {
  constructor() {
    // Store in user data directory, not app bundle
    this.configPath = path.join(os.homedir(), 'storygrind_projects', 'encrypted-keys.json');
    this.ensureDirectory();
  }

  ensureDirectory() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Device-specific encryption key
  getDeviceKey() {
    const machineInfo = os.hostname() + os.userInfo().username + os.platform();
    return crypto.createHash('sha256').update(machineInfo).digest();
  }

  // Internal encrypt for storage
  _encrypt(plaintext) {
    const key = this.getDeviceKey().slice(0, 32); // Use first 32 bytes for AES-256
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      data: encrypted
    };
  }

  // Internal decrypt from storage
  _decrypt(encryptedData) {
    const key = this.getDeviceKey().slice(0, 32); // Use first 32 bytes for AES-256
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Check if encryption is available (always true for this implementation)
  isEncryptionAvailable() {
    return true;
  }

  // Encrypt string and return Buffer
  encryptString(plaintext) {
    try {
      const encrypted = this._encrypt(plaintext);
      // Return as Buffer with latin1 encoding
      const result = JSON.stringify(encrypted);
      return Buffer.from(result, 'utf8');
    } catch (error) {
      console.error('Failed to encrypt string:', error);
      throw error;
    }
  }

  // Decrypt Buffer and return string
  decryptString(encryptedBuffer) {
    try {
      // Convert Buffer back to string and parse
      const encryptedData = JSON.parse(encryptedBuffer.toString('utf8'));
      return this._decrypt(encryptedData);
    } catch (error) {
      console.error('Failed to decrypt string:', error);
      throw error;
    }
  }

  // Save encrypted API key (convenience method)
  setItem(keyName, value) {
    const encrypted = this._encrypt(value);
    
    let config = {};
    if (fs.existsSync(this.configPath)) {
      config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    }
    
    config[keyName] = encrypted;
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  // Get decrypted value (convenience method)
  getItem(keyName) {
    if (!fs.existsSync(this.configPath)) return null;
    
    try {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      if (!config[keyName]) return null;
      
      return this._decrypt(config[keyName]);
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      return null;
    }
  }
}

const saferStorageInstance = new SaferStorage();

module.exports = saferStorageInstance;
