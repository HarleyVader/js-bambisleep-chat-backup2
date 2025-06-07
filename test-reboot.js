#!/usr/bin/env node

/**
 * Test script for server reboot functionality
 * Tests the reboot API endpoint and control network integration
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:6969';

async function testRebootAPI() {
  console.log('🧪 Testing Server Reboot API...');
  
  try {
    // Test server health first
    console.log('📊 Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/db-status`);
    console.log('✅ Server is healthy:', healthResponse.data.healthy);
    
    // Test reboot endpoint
    console.log('🔄 Triggering server reboot...');
    const rebootResponse = await axios.post(`${BASE_URL}/api/reboot`, {
      duration: 120 // 2 minutes maintenance
    });
    
    console.log('✅ Reboot Response:', rebootResponse.data);
    console.log('🕒 Maintenance Duration:', rebootResponse.data.maintenanceDuration, 'seconds');
    
    // Wait a moment then check if server enters maintenance mode
    console.log('⏱️ Waiting 3 seconds then checking maintenance mode...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const maintenanceCheck = await axios.get(`${BASE_URL}/health`);
      console.log('📋 Server status during maintenance:', maintenanceCheck.status);
    } catch (error) {
      if (error.response && error.response.status === 503) {
        console.log('✅ Server correctly entered maintenance mode (503 Service Unavailable)');
      } else {
        console.log('❌ Unexpected error during maintenance check:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testRebootAPI();
