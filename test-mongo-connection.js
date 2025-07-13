#!/usr/bin/env node
/**
 * Simple MongoDB connection test
 */

import mongoose from 'mongoose';

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bambisleep';
    console.log('📍 Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🔌 Connection state:', mongoose.connection.readyState);
    
    // Test a simple operation
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('📁 Collections found:', collections.length);
    } catch (authError) {
      console.log('⚠️  Collections listing requires auth, but connection works');
      // Test basic database access
      const stats = await mongoose.connection.db.command({ ping: 1 });
      console.log('🏓 Ping result:', stats.ok ? 'SUCCESS' : 'FAILED');
    }
    
    await mongoose.disconnect();
    console.log('🔚 Disconnected successfully');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  }
}

testConnection();
