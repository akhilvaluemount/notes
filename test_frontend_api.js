// Test script to simulate frontend API calls
// Using Node.js 18+ built-in fetch

async function testStreamingAPI() {
  console.log('Testing streaming AI API from frontend perspective...');
  
  const API_BASE_URL = 'http://localhost:5001';
  
  try {
    console.log('Making streaming request to:', `${API_BASE_URL}/api/ask-ai-stream`);
    
    const response = await fetch(`${API_BASE_URL}/api/ask-ai-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: 'What is React in simple terms?' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Response received, starting to process stream...');
    let fullResponse = '';
    let chunkCount = 0;

    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

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
              console.log(`Chunk ${chunkCount}: "${data.content}"`);
            } else if (data.type === 'complete') {
              console.log('Stream complete!');
              console.log('Full response length:', data.fullResponse.length);
              console.log('Full response preview:', data.fullResponse.substring(0, 200) + '...');
              return data.fullResponse;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    
    return fullResponse;
  } catch (error) {
    console.error('Error in streaming API test:', error);
  }
}

// Run the test
testStreamingAPI().then(response => {
  console.log('\n=== TEST RESULTS ===');
  console.log('Response received:', !!response);
  console.log('Response length:', response ? response.length : 0);
  
  if (response) {
    console.log('SUCCESS: Frontend API simulation worked correctly!');
    console.log('The issue is not with the backend API.');
  } else {
    console.log('FAILED: Frontend API simulation failed.');
  }
});