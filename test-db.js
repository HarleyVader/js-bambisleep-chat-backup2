/**
 * Database Testing Utility
 * 
 * This script tests various database connections and API endpoints.
 * Run with: node test-db.js
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';

const exec = promisify(execCb);
dotenv.config();

const BASE_URL = `http://localhost:${process.env.SERVER_PORT || 6970}`;
const DB_URI = process.env.MONGODB_URI;
const PROFILES_URI = process.env.MONGODB_PROFILES;
const CHAT_URI = process.env.MONGODB_CHAT;
const AIGF_LOGS_URI = process.env.MONGODB_AIGF_LOGS;

async function testMongoDBConnection(uri, name) {
  console.log(`Testing ${name} connection...`);
  try {
    const conn = await mongoose.createConnection(uri);
    console.log(`✅ Successfully connected to ${name}`);
    
    try {
      const collections = await conn.db.listCollections().toArray();
      console.log(`Collections in ${name}:`, collections.map(c => c.name));
    } catch (err) {
      console.log(`⚠️ Could not list collections in ${name}: ${err.message}`);
    }
    
    await conn.close();
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to ${name}:`, error.message);
    return false;
  }
}

async function testAPIEndpoint(endpoint, method = 'GET') {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`Testing API endpoint: ${url}`);
  try {
    const response = await fetch(url, { method });
    
    if (!response.ok) {
      console.log(`⚠️ API endpoint ${endpoint} responded with status ${response.status}`);
      return { success: false, status: response.status };
    }
    
    try {
      const data = await response.json();
      console.log(`✅ API endpoint ${endpoint} responded with status ${response.status}`);
      return { success: true, data, status: response.status };
    } catch (err) {
      console.log(`⚠️ API endpoint ${endpoint} returned non-JSON response: ${err.message}`);
      return { success: true, text: await response.text(), status: response.status };
    }
  } catch (error) {
    console.error(`❌ Failed to access API endpoint ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testDockerContainer() {
  try {
    const { stdout } = await exec('docker ps | findstr bambisleep-mongodb');
    if (stdout.includes('bambisleep-mongodb')) {
      console.log('✅ MongoDB container is running');
      return true;
    } else {
      console.log('❌ MongoDB container is not running');
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking Docker container:', error.message);
    return false;
  }
}

async function main() {
  console.log('=== BambiSleep Chat Database Test Utility ===');
  
  // Check Docker container
  await testDockerContainer();
  
  // Test MongoDB connections
  await testMongoDBConnection(DB_URI, 'Main Database');
  await testMongoDBConnection(PROFILES_URI, 'Profiles Database');
  await testMongoDBConnection(CHAT_URI, 'Chat Database');
  await testMongoDBConnection(AIGF_LOGS_URI, 'AIGF Logs Database');
  
  // Test API endpoints
  await testAPIEndpoint('/api/db-status');
  
  console.log('=== Database Test Complete ===');
}

main().catch(console.error);
