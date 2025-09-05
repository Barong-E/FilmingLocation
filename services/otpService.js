import crypto from 'crypto';

class OTPService {
  // OTP 시크릿 키 생성 (Base32, GA 호환)
  generateSecret() {
    const bytes = crypto.randomBytes(20);
    return this.base32Encode(bytes);
  }

  // Base32 인코딩 (RFC 4648)
  base32Encode(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
  }

  // Base32 디코딩 → Buffer
  base32Decode(str) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const char = str[i].toUpperCase();
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }

  // TOTP 토큰 생성 (Google Authenticator 호환)
  generateTOTP(secret, timeStep = 30, digits = 6) {
    const now = Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / timeStep);
    return this.generateHOTP(secret, counter, digits);
  }

  // HOTP 토큰 생성 (RFC 4226)
  generateHOTP(secret, counter, digits = 6) {
    const key = this.base32Decode(secret);
    // 8바이트 big-endian 카운터 버퍼 생성 (BigInt 사용)
    const buf = Buffer.alloc(8);
    let ctr = BigInt(counter);
    for (let i = 7; i >= 0; i--) {
      buf[i] = Number(ctr & 0xffn);
      ctr >>= 8n;
    }

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % Math.pow(10, digits);
    return code.toString().padStart(digits, '0');
  }

  // TOTP 검증 (시간 윈도우 허용)
  verifyTOTP(secret, token, window = 1) {
    const now = Math.floor(Date.now() / 1000);
    const step = 30;
    for (let i = -window; i <= window; i++) {
      const counter = Math.floor(now / step) + i;
      const expected = this.generateHOTP(secret, counter);
      if (token === expected) return true;
    }
    return false;
  }

  // QR 코드 URL (Google Authenticator)
  generateQRUrl(secret, label, issuer = 'FiLo Admin') {
    const encodedLabel = encodeURIComponent(label);
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedSecret = encodeURIComponent(secret);
    return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }
}

export default new OTPService();
