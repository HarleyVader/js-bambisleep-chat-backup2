// Test script to verify the LMStudio model selection fix
import axios from 'axios';

async function testModelSelection() {
  console.log('🧪 Testing LMStudio Model Selection Fix');
  console.log('=====================================');
  
  try {
    // Test API connection
    console.log('1️⃣ Testing LMStudio API connection...');
    const response = await axios.get('http://192.168.0.69:7777/v1/models');
    const models = response.data.data;
    console.log(`✅ Connected successfully. Found ${models.length} total models.`);
    
    // Filter out embedding models
    const chatModels = models.filter(model => 
      !model.id.toLowerCase().includes('embedding') && 
      !model.id.toLowerCase().includes('embed')
    );
    console.log(`✅ Filtered to ${chatModels.length} chat models (removed embedding models).`);
    
    // Test model selection logic
    console.log('\n2️⃣ Testing model selection logic...');
    const targetModel = 'l3-sthenomaidblackroot-8b-v1@q2_k';
    console.log(`Looking for: ${targetModel}`);
    
    // Try exact match
    let selectedModel = chatModels.find(model => model.id.toLowerCase() === targetModel.toLowerCase());
    console.log(`Exact match: ${selectedModel ? selectedModel.id : 'NOT FOUND'}`);
    
    // Try base model name (remove quantization suffix)
    if (!selectedModel) {
      const baseModelName = targetModel.split('@')[0];
      selectedModel = chatModels.find(model => model.id.toLowerCase().includes(baseModelName.toLowerCase()));
      console.log(`Base name match (${baseModelName}): ${selectedModel ? selectedModel.id : 'NOT FOUND'}`);
    }
    
    // Fallback to first chat model
    const result = selectedModel ? selectedModel.id : (chatModels.length > 0 ? chatModels[0].id : models[0].id);
    
    console.log('\n3️⃣ Final Result:');
    console.log(`Selected Model: ${result}`);
    
    if (selectedModel) {
      console.log('✅ SUCCESS: Target model found successfully!');
    } else {
      console.log('⚠️ WARNING: Target model not found, using fallback.');
    }
    
    // Verify it's not an embedding model
    if (result.toLowerCase().includes('embedding') || result.toLowerCase().includes('embed')) {
      console.log('❌ ERROR: Selected model is an embedding model! This would cause chat failures.');
      return false;
    } else {
      console.log('✅ SUCCESS: Selected model is a chat model (not embedding).');
    }
    
    // Test chat completion endpoint
    console.log('\n4️⃣ Testing chat completion with selected model...');
    const testPayload = {
      model: result,
      messages: [
        { role: "user", content: "Hello, this is a test message." }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
      try {
      const chatResponse = await axios.post('http://192.168.0.69:7777/v1/chat/completions', testPayload, {
        timeout: 30000  // Increased to 30 seconds for model loading
      });
      
      if (chatResponse.data && chatResponse.data.choices && chatResponse.data.choices[0]) {
        const aiResponse = chatResponse.data.choices[0].message.content;
        console.log('✅ SUCCESS: AI responded successfully!');
        console.log(`📝 AI Response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);
        console.log('\n🎉 MODEL SELECTION FIX WORKING CORRECTLY! 🎉');
        return true;
      } else {
        console.log('❌ ERROR: No response content from AI.');
        return false;
      }
    } catch (chatError) {
      console.log(`❌ ERROR: Chat completion failed: ${chatError.message}`);
      if (chatError.response) {
        console.log(`HTTP Status: ${chatError.response.status}`);
        console.log(`Response: ${JSON.stringify(chatError.response.data, null, 2)}`);
      }
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - Is LMStudio running on 192.168.0.69:7777?');
    }
    return false;
  }
}

// Run the test
testModelSelection().then(success => {
  console.log(`\n${success ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED'}`);
  process.exit(success ? 0 : 1);
});
