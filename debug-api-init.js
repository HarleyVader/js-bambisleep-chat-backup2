#!/usr/bin/env node
/**
 * Debug Control Network API with initialization
 */

import bambiControlNetwork from './src/services/bambiControlNetwork.js';

console.log('🔧 Debug Control Network API with initialization');

async function test() {
  try {
    console.log('🌀 Initializing control network...');
    await bambiControlNetwork.initialize();
    
    console.log('📊 Testing getSystemStatus after init...');
    const status = bambiControlNetwork.getSystemStatus();
    console.log('✅ Status:', JSON.stringify(status, null, 2));
    
    // Add a test node
    console.log('➕ Adding test node...');
    bambiControlNetwork.addControlNode('test-node-1', {
      type: 'USER',
      metadata: { test: true }
    });
    
    console.log('📊 Testing status with node...');
    const statusWithNode = bambiControlNetwork.getSystemStatus();
    console.log('✅ Status with node:', JSON.stringify(statusWithNode, null, 2));
    
    console.log('📊 Testing getConnectedNodes...');
    const nodes = bambiControlNetwork.getConnectedNodes();
    console.log('✅ Nodes:', JSON.stringify(nodes, null, 2));
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

test().then(() => {
  console.log('🏁 Debug complete');
});
