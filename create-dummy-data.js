#!/usr/bin/env node
/**
 * Create dummy data for MongoDB on localhost:27017
 */

import mongoose from 'mongoose';

// Define simple schemas for dummy data
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now }
});

const ProfileSchema = new mongoose.Schema({
  username: String,
  displayName: String,
  lastActive: { type: Date, default: Date.now }
});

async function createDummyData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27020/bambisleep';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Create models
    const User = mongoose.model('User', UserSchema);
    const Message = mongoose.model('Message', MessageSchema);
    const Profile = mongoose.model('Profile', ProfileSchema);
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Message.deleteMany({});
    await Profile.deleteMany({});
    
    // Create dummy users
    console.log('👥 Creating dummy users...');
    const users = await User.insertMany([
      { username: 'alice', email: 'alice@example.com' },
      { username: 'bob', email: 'bob@example.com' },
      { username: 'charlie', email: 'charlie@example.com' },
      { username: 'diana', email: 'diana@example.com' },
      { username: 'eve', email: 'eve@example.com' }
    ]);
    console.log(`✅ Created ${users.length} users`);
    
    // Create dummy messages
    console.log('💬 Creating dummy messages...');
    const messages = await Message.insertMany([
      { user: 'alice', message: 'Hello everyone!' },
      { user: 'bob', message: 'How is everyone doing today?' },
      { user: 'charlie', message: 'Great weather outside!' },
      { user: 'diana', message: 'Anyone want to chat?' },
      { user: 'eve', message: 'Good morning!' },
      { user: 'alice', message: 'Working on some cool projects' },
      { user: 'bob', message: 'MongoDB is awesome!' },
      { user: 'charlie', message: 'Love using Docker for development' }
    ]);
    console.log(`✅ Created ${messages.length} messages`);
    
    // Create dummy profiles
    console.log('👤 Creating dummy profiles...');
    const profiles = await Profile.insertMany([
      { username: 'alice', displayName: 'Alice Wonder' },
      { username: 'bob', displayName: 'Bob Builder' },
      { username: 'charlie', displayName: 'Charlie Brown' },
      { username: 'diana', displayName: 'Diana Prince' },
      { username: 'eve', displayName: 'Eve Online' }
    ]);
    console.log(`✅ Created ${profiles.length} profiles`);
    
    // Show summary
    console.log('\n📊 Database Summary:');
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Messages: ${await Message.countDocuments()}`);
    console.log(`   Profiles: ${await Profile.countDocuments()}`);
    
    console.log('\n🎯 Sample Data Created Successfully!');
    console.log('You can now test your application with this dummy data.');
    
    await mongoose.disconnect();
    console.log('🔚 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error creating dummy data:');
    console.error('   Error:', error.message);
    process.exit(1);
  }
}

createDummyData();
