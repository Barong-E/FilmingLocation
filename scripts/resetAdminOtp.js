import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import otp from '../services/otpService.js';

dotenv.config();
await connectDB();

const admin = await Admin.findOne({ username: 'admin' });
if (!admin) {
  console.log('관리자 계정(admin) 없음');
  process.exit(1);
}

admin.otpSecret = otp.generateSecret(); // Base32
admin.otpEnabled = true;
await admin.save();

console.log('NEW SECRET:', admin.otpSecret);
console.log('QR URL:', otp.generateQRUrl(admin.otpSecret, admin.username));
process.exit(0);