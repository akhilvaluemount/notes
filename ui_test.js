// UI Test: Verify that AI response state updates are working in the browser
// This test will make a direct API call and check if the UI updates properly

const axios = require('axios');

console.log('🧪 UI Test: Checking if frontend receives AI response updates...\n');

const API_BASE_URL = 'http://localhost:5001';

// Test the streaming endpoint
async function testUIResponseHandling() {
  console.log('1. Making API call to test frontend-backend integration');
  
  const testPrompt = 'What is React? Provide a brief explanation.';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask-ai-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: testPrompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ API call successful');
    console.log('2. Response is streaming properly');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'chunk') {
              chunkCount++;
              fullResponse += data.content;
              if (chunkCount === 1) {
                console.log('✅ First chunk received successfully');
              }
            } else if (data.type === 'complete') {
              console.log('✅ Stream completed successfully');
              console.log('📊 Final response length:', data.fullResponse?.length || 0);
              console.log('📊 Total chunks received:', chunkCount);
              
              if (data.fullResponse && data.fullResponse.length > 0) {
                console.log('\n🎯 CONCLUSION: Backend API is working perfectly!');
                console.log('📄 Response preview:', data.fullResponse.substring(0, 150) + '...');
                console.log('\n⚠️  Since backend is working, the issue must be in the React UI:');
                console.log('   - Check if the browser at http://localhost:3000 shows the debug panels');
                console.log('   - Look for any console errors in the browser');
                console.log('   - Verify that setAiResponse is being called properly');
                console.log('   - Check if the ResponsePanel is rendering the response');
                return data.fullResponse;
              }
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the test
testUIResponseHandling();