/**
 * @module seedAdmin
 * @description Standalone CLI script to create or promote a user to admin.
 *
 * Usage:
 *   node src/utils/seedAdmin.js <email> <password>
 *
 * If a user with the given email exists, their role is set to 'admin' and
 * their accountStatus to 'approved'. Otherwise a new admin user is created.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables from .env
dotenv.config();

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node src/utils/seedAdmin.js <email> <password>');
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email });

  if (user) {
    user.role = 'admin';
    user.accountStatus = 'approved';
    await user.save();
    console.log(`Updated existing user to admin: ${email}`);
  } else {
    user = await User.create({
      name: 'Admin',
      email,
      password,
      role: 'admin',
      accountStatus: 'approved',
    });
    console.log(`Created admin user: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (error) {
  console.error('Seed admin failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
}
