/**
 * Client-side Bambi Control Network Integration
 * Connects client-side components with server-side control network
 */

// Initialize client-side control network
window.bambiControlNetwork = (function() {
  let socket = null;
  let nodeId = null;
  let isConnected = false;
  let registeredNodes = new Map();
  
  // Initialize with socket connection
  function initialize(socketConnection) {
    socket = socketConnection;
    
    if (!socket) {
      console.warn('🎛️ Control Network: No socket connection provided');
      return false;
    }
    
    // Listen for control network events from server
    socket.on('control-signal', (data) => {
      console.log('🎛️ Received control signal:', data);
      
      // Broadcast to registered nodes
      registeredNodes.forEach((nodeData, nodeId) => {
        if (nodeData.onSignal && typeof nodeData.onSignal === 'function') {
          try {
            nodeData.onSignal(data.signalType, data.signalData, data.sourceId);
          } catch (error) {
            console.error(`🎛️ Error processing signal in node ${nodeId}:`, error);
          }
        }
      });
    });
    
    socket.on('control-network-status', (status) => {
      isConnected = status.connected;
      console.log('🎛️ Control Network status:', status);
    });
    
    socket.on('connect', () => {
      console.log('🎛️ Control Network: Socket connected');
      requestNetworkStatus();
    });
    
    socket.on('disconnect', () => {
      console.log('🎛️ Control Network: Socket disconnected');
      isConnected = false;
    });
    
    return true;
  }
  
  // Register a control node
  function registerControlNode(id, nodeType, nodeData = {}) {
    if (!id || typeof id !== 'string') {
      console.error('🎛️ Control Network: Invalid node ID');
      return false;
    }
    
    const node = {
      id: id,
      type: nodeType,
      data: nodeData,
      registered: Date.now(),
      onSignal: nodeData.onSignal || null
    };
    
    registeredNodes.set(id, node);
    
    // Send registration to server if connected
    if (socket && socket.connected) {
      socket.emit('register-control-node', {
        nodeId: id,
        nodeType: nodeType,
        nodeData: nodeData
      });
    }
    
    console.log(`📡 Control Network: Registered node ${id} as ${nodeType}`);
    return true;
  }
  
  // Unregister a control node
  function unregisterControlNode(id) {
    if (!registeredNodes.has(id)) {
      return false;
    }
    
    registeredNodes.delete(id);
    
    // Send unregistration to server if connected
    if (socket && socket.connected) {
      socket.emit('unregister-control-node', { nodeId: id });
    }
    
    console.log(`📡 Control Network: Unregistered node ${id}`);
    return true;
  }
  
  // Process a control signal
  function processControlSignal(signalType, signalData, sourceId, options = {}) {
    if (!signalType) {
      console.error('🎛️ Control Network: Invalid signal type');
      return false;
    }
    
    const signal = {
      signalType: signalType,
      signalData: signalData,
      sourceId: sourceId,
      timestamp: Date.now(),
      options: options
    };
    
    console.log('🎛️ Processing control signal:', signal);
    
    // Send to server if connected
    if (socket && socket.connected) {
      socket.emit('control-signal', signal);
    }
    
    // Broadcast to local nodes
    registeredNodes.forEach((nodeData, nodeId) => {
      if (nodeData.onSignal && typeof nodeData.onSignal === 'function') {
        try {
          nodeData.onSignal(signalType, signalData, sourceId);
        } catch (error) {
          console.error(`🎛️ Error processing signal in node ${nodeId}:`, error);
        }
      }
    });
    
    return true;
  }
  
  // Update node activity
  function updateNodeActivity(id) {
    const node = registeredNodes.get(id);
    if (node) {
      node.lastActivity = Date.now();
      
      // Send activity update to server if connected
      if (socket && socket.connected) {
        socket.emit('update-node-activity', { nodeId: id });
      }
      
      return true;
    }
    return false;
  }
  
  // Get network status
  function getNetworkStatus() {
    return {
      connected: isConnected,
      socket: socket ? socket.connected : false,
      nodes: registeredNodes.size,
      nodeIds: Array.from(registeredNodes.keys())
    };
  }
  
  // Request status from server
  function requestNetworkStatus() {
    if (socket && socket.connected) {
      socket.emit('get-control-network-status');
    }
  }
  
  // Get registered nodes
  function getRegisteredNodes() {
    return Array.from(registeredNodes.values());
  }
  
  // Public API
  return {
    initialize: initialize,
    registerControlNode: registerControlNode,
    unregisterControlNode: unregisterControlNode,
    processControlSignal: processControlSignal,
    updateNodeActivity: updateNodeActivity,
    getNetworkStatus: getNetworkStatus,
    getRegisteredNodes: getRegisteredNodes,
    requestNetworkStatus: requestNetworkStatus
  };
})();

// Auto-initialize when socket becomes available
document.addEventListener('DOMContentLoaded', () => {
  // Wait for socket to be available
  const checkSocket = () => {
    if (window.socket) {
      console.log('🎛️ Initializing Control Network with socket');
      window.bambiControlNetwork.initialize(window.socket);
      
      // Auto-register primary client node
      const clientNodeId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      window.bambiControlNetwork.registerControlNode(clientNodeId, 'CLIENT', {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        capabilities: ['ui_interaction', 'event_handling', 'signal_processing']
      });
      
      window.bambiControlNetwork.clientNodeId = clientNodeId;
    } else {
      // Retry after a short delay
      setTimeout(checkSocket, 100);
    }
  };
  
  checkSocket();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.bambiControlNetwork && window.bambiControlNetwork.clientNodeId) {
    window.bambiControlNetwork.unregisterControlNode(window.bambiControlNetwork.clientNodeId);
  }
});
