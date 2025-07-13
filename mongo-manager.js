#!/usr/bin/env node
/**
 * MongoDB Connection Manager and Status Checker
 * Provides easy management of different MongoDB instances
 */

import mongoose from 'mongoose';

const MONGODB_INSTANCES = {
  'localhost:27017': {
    name: 'Existing MongoDB (ai-framework)',
    uri: 'mongodb://localhost:27017/bambisleep',
    description: 'Main MongoDB instance (may require auth)'
  },
  'localhost:27018': {
    name: 'Bambisleep MongoDB (Docker Compose)',
    uri: 'mongodb://brandynette:bambibrandybomboBarbieAdminPassgoodGirlSMakeMoreGoodGirls@localhost:27018/bambisleep?authSource=admin',
    description: 'From docker-compose.yml with authentication'
  },
  'localhost:27020': {
    name: 'Dummy Data MongoDB (No Auth)',
    uri: 'mongodb://localhost:27020/bambisleep',
    description: 'Simple instance for testing with dummy data'
  }
};

async function checkConnection(name, config) {
  try {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`   URI: ${config.uri.replace(/\/\/[^@]+@/, '//***:***@')}`);
    console.log(`   Description: ${config.description}`);
    
    await mongoose.connect(config.uri, {
      serverSelectionTimeoutMS: 3000,
      maxPoolSize: 5,
    });
    
    console.log(`   ✅ Connection: SUCCESS`);
    console.log(`   📊 Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   🔌 State: ${mongoose.connection.readyState}`);
    
    try {
      const ping = await mongoose.connection.db.command({ ping: 1 });
      console.log(`   🏓 Ping: ${ping.ok ? 'SUCCESS' : 'FAILED'}`);
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`   📁 Collections: ${collections.length}`);
      
      if (collections.length > 0) {
        console.log(`   📋 Collection names: ${collections.map(c => c.name).join(', ')}`);
      }
    } catch (authError) {
      console.log(`   ⚠️  Limited access (auth required for some operations)`);
    }
    
    await mongoose.disconnect();
    return true;
    
  } catch (error) {
    console.log(`   ❌ Connection: FAILED`);
    console.log(`   🚨 Error: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    return false;
  }
}

async function checkAllConnections() {
  console.log('🚀 MongoDB Connection Status Check');
  console.log('=====================================');
  
  let successCount = 0;
  const total = Object.keys(MONGODB_INSTANCES).length;
  
  for (const [key, config] of Object.entries(MONGODB_INSTANCES)) {
    const success = await checkConnection(key, config);
    if (success) successCount++;
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Working: ${successCount}/${total}`);
  console.log(`   ❌ Failed: ${total - successCount}/${total}`);
  
  if (successCount > 0) {
    console.log('\n💡 Recommendations:');
    console.log('   • Use localhost:27020 for development with dummy data');
    console.log('   • Use localhost:27017 for production (existing setup)');
    console.log('   • Use localhost:27018 for docker-compose deployment');
  }
  
  console.log('\n🔧 Docker Container Status:');
  console.log('   Run: docker ps | grep mongo');
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'check' || !command) {
    await checkAllConnections();
  } else if (command === 'dummy') {
    console.log('🎯 Creating dummy data on localhost:27020...');
    const { spawn } = await import('child_process');
    spawn('node', ['create-dummy-data.js'], { stdio: 'inherit' });
  } else {
    console.log('Usage:');
    console.log('  node mongo-manager.js check    # Check all connections');
    console.log('  node mongo-manager.js dummy    # Create dummy data');
  }
}

main().catch(console.error);
