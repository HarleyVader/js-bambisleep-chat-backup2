#!/usr/bin/env node
/**
 * Test MongoDB Database Connections
 * Verifies all three databases are accessible with the new configuration
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connections = {
  'Main/Profiles DB': process.env.MONGODB_URI,
  'Chat DB': process.env.MONGODB_CHAT,
  'AIGF Logs DB': process.env.MONGODB_AIGF_LOGS
};

async function testConnection(name, uri) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   URI: ${uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
  
  try {
    const connection = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 5,
    });
    
    // Wait for connection to be ready
    await new Promise((resolve, reject) => {
      if (connection.readyState === 1) {
        resolve();
      } else {
        connection.once('connected', resolve);
        connection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      }
    });
    
    console.log(`   ✅ Connection: SUCCESS`);
    console.log(`   📊 Database: ${connection.name}`);
    console.log(`   🔌 State: ${connection.readyState}`);
    
    // Test ping
    const ping = await connection.db.command({ ping: 1 });
    console.log(`   🏓 Ping: ${ping.ok ? 'SUCCESS' : 'FAILED'}`);
    
    // List collections
    const collections = await connection.db.listCollections().toArray();
    console.log(`   📁 Collections: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log(`   📋 Names: ${collections.map(c => c.name).slice(0, 5).join(', ')}${collections.length > 5 ? '...' : ''}`);
    }
    
    await connection.close();
    return true;
    
  } catch (error) {
    console.log(`   ❌ Connection: FAILED`);
    console.log(`   🚨 Error: ${error.message}`);
    return false;
  }
}

async function testAllConnections() {
  console.log('🚀 MongoDB Connection Test');
  console.log('===========================');
  
  let successCount = 0;
  const total = Object.keys(connections).length;
  
  for (const [name, uri] of Object.entries(connections)) {
    const success = await testConnection(name, uri);
    if (success) successCount++;
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Working: ${successCount}/${total}`);
  console.log(`   ❌ Failed: ${total - successCount}/${total}`);
  
  if (successCount === total) {
    console.log('\n🎉 All database connections successful!');
    console.log('💡 Your application is ready to connect to MongoDB.');
  } else {
    console.log('\n⚠️  Some connections failed. Check your configuration.');
    process.exit(1);
  }
}

testAllConnections();
