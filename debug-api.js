#!/usr/bin/env node
/**
 * Debug Control Network API
 */

import bambiControlNetwork from './src/services/bambiControlNetwork.js';

console.log('🔧 Debug Control Network API');

try {
  console.log('📊 Testing getSystemStatus...');
  const status = bambiControlNetwork.getSystemStatus();
  console.log('✅ Status:', JSON.stringify(status, null, 2));
} catch (error) {
  console.error('❌ getSystemStatus error:', error.message);
}

try {
  console.log('📊 Testing getMetrics...');
  const metrics = bambiControlNetwork.getMetrics();
  console.log('✅ Metrics:', JSON.stringify(metrics, null, 2));
} catch (error) {
  console.error('❌ getMetrics error:', error.message);
}

try {
  console.log('📊 Testing getConnectedNodes...');
  const nodes = bambiControlNetwork.getConnectedNodes();
  console.log('✅ Nodes:', JSON.stringify(nodes, null, 2));
} catch (error) {
  console.error('❌ getConnectedNodes error:', error.message);
}

console.log('🏁 Debug complete');
