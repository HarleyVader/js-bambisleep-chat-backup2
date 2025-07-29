import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Debugging LM Studio Connection');
console.log('================================');
console.log(`LMS_HOST: ${process.env.LMS_HOST}`);
console.log(`LMS_PORT: ${process.env.LMS_PORT}`);

const apiUrl = `http://${process.env.LMS_HOST}:${process.env.LMS_PORT}/v1/models`;
console.log(`Full API URL: ${apiUrl}`);
console.log('');

async function testConnection() {
  try {
    console.log('📡 Testing connection to LM Studio...');
    const response = await axios.get(apiUrl, { timeout: 5000 });
    
    console.log('✅ Connection successful!');
    console.log(`Status: ${response.status}`);
    console.log(`Models found: ${response.data.data.length}`);
    console.log('');
    
    console.log('📋 Available models:');
    response.data.data.forEach((model, index) => {
      const isEmbedding = model.id.toLowerCase().includes('embedding') || model.id.toLowerCase().includes('embed');
      console.log(`  ${index + 1}. ${model.id} ${isEmbedding ? '(embedding model)' : '(chat model)'}`);
    });
    
    // Test chat models specifically
    const chatModels = response.data.data.filter(model => 
      !model.id.toLowerCase().includes('embedding') && 
      !model.id.toLowerCase().includes('embed')
    );
    
    console.log('');
    console.log(`🤖 Chat models available: ${chatModels.length}`);
    if (chatModels.length > 0) {
      console.log(`First chat model: ${chatModels[0].id}`);
    }
    
  } catch (error) {
    console.log('❌ Connection failed!');
    console.log(`Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Suggestion: Is LM Studio running and serving on the correct port?');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Suggestion: Check if the IP address is correct');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Suggestion: Check network connectivity or firewall settings');
    }
  }
}

// Test a simple chat completion
async function testChatCompletion() {
  try {
    console.log('');
    console.log('🗨️  Testing chat completion...');
    
    const chatUrl = `http://${process.env.LMS_HOST}:${process.env.LMS_PORT}/v1/chat/completions`;
    const testPayload = {
      model: "qwen2.5-coder-1.5b-instruct", // Using a model we know exists
      messages: [{ role: "user", content: "Hello! Can you respond with just 'LM Studio is working'?" }],
      max_tokens: 50,
      temperature: 0.1
    };
    
    const response = await axios.post(chatUrl, testPayload, { timeout: 10000 });
    
    console.log('✅ Chat completion successful!');
    console.log(`Response: ${response.data.choices[0].message.content}`);
    
  } catch (error) {
    console.log('❌ Chat completion failed!');
    console.log(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run tests
await testConnection();
await testChatCompletion();
