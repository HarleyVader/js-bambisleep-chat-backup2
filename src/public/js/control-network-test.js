/**
 * Test script for Bambi Control Network Integration
 * This script validates that all components are properly integrated
 */

document.addEventListener('DOMContentLoaded', () => {
  // Wait for all systems to initialize
  setTimeout(() => {
    runControlNetworkTests();
  }, 3000);
});

function runControlNetworkTests() {
  console.log('🧪 Starting Bambi Control Network Integration Tests...');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: Check if bambiControlNetwork is available
  test('bambiControlNetwork Object Available', () => {
    return typeof window.bambiControlNetwork === 'object' && window.bambiControlNetwork !== null;
  });
  
  // Test 2: Check if main functions exist
  test('Control Network Functions Available', () => {
    const required = ['registerControlNode', 'processControlSignal', 'getNetworkStatus'];
    return required.every(fn => typeof window.bambiControlNetwork[fn] === 'function');
  });
  
  // Test 3: Check if socket is connected
  test('Socket Connection', () => {
    return window.socket && window.socket.connected;
  });
  
  // Test 4: Check if AIGF Core is registered
  test('AIGF Core Registration', () => {
    const status = window.bambiControlNetwork.getNetworkStatus();
    return status.nodes > 0 && status.nodeIds.some(id => id.includes('aigf-core'));
  });
  
  // Test 5: Check if TTS is registered
  test('TTS Registration', () => {
    const status = window.bambiControlNetwork.getNetworkStatus();
    return status.nodeIds.some(id => id.includes('tts'));
  });
  
  // Test 6: Test signal processing
  test('Signal Processing', () => {
    try {
      const result = window.bambiControlNetwork.processControlSignal('TEST_SIGNAL', {
        test: true,
        timestamp: Date.now()
      }, 'test-node');
      return result === true;
    } catch (error) {
      console.error('Signal processing test failed:', error);
      return false;
    }
  });
  
  // Test 7: Check control network status display
  test('Status Display Elements', () => {
    const elements = [
      'control-network-status',
      'network-status-indicator', 
      'network-node-count',
      'client-network-status'
    ];
    return elements.every(id => document.getElementById(id) !== null);
  });
  
  // Helper function to run individual tests
  function test(name, testFunction) {
    try {
      const passed = testFunction();
      results.tests.push({ name, passed, error: null });
      if (passed) {
        results.passed++;
        console.log(`✅ ${name}: PASSED`);
      } else {
        results.failed++;
        console.log(`❌ ${name}: FAILED`);
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name, passed: false, error: error.message });
      console.log(`❌ ${name}: ERROR - ${error.message}`);
    }
  }
  
  // Display final results
  setTimeout(() => {
    console.log('\n🧪 Test Results Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${results.tests.length}`);
    
    if (results.failed === 0) {
      console.log('🎉 All tests passed! Bambi Control Network is fully integrated.');
      
      // Update UI to show successful integration
      const statusEl = document.getElementById('client-network-status');
      if (statusEl) {
        statusEl.textContent = 'Integrated ✅';
        statusEl.style.color = '#0f0';
      }
    } else {
      console.log('⚠️ Some tests failed. Check the integration.');
      
      // Update UI to show integration issues
      const statusEl = document.getElementById('client-network-status');
      if (statusEl) {
        statusEl.textContent = 'Issues ⚠️';
        statusEl.style.color = '#f80';
      }
    }
    
    // Make test results available globally for debugging
    window.controlNetworkTestResults = results;
  }, 1000);
}
