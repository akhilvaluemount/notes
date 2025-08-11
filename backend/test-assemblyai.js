const { AssemblyAI } = require('assemblyai');
require('dotenv').config();

async function testAssemblyAI() {
  console.log('🔍 Testing AssemblyAI API connection...');
  
  try {
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });

    console.log('✅ AssemblyAI client created');
    console.log('🔑 API Key:', process.env.ASSEMBLYAI_API_KEY?.substring(0, 8) + '...');

    // Test realtime streaming
    console.log('🎵 Creating realtime transcriber...');
    const rt = client.streaming.transcriber({
      sampleRate: 16000,
      encoding: 'pcm_s16le'
    });

    let connected = false;
    let transcriptReceived = false;

    rt.on('open', () => {
      console.log('✅ Realtime connection opened');
      connected = true;
      
      // Send some silence/dummy audio data
      const silenceBuffer = new ArrayBuffer(8192);
      const silenceArray = new Int16Array(silenceBuffer);
      silenceArray.fill(0); // Fill with silence
      
      console.log('📤 Sending test audio data...');
      rt.sendAudio(silenceBuffer);
      
      setTimeout(() => {
        console.log('🔚 Closing connection...');
        rt.close();
      }, 5000);
    });

    rt.on('transcript', (transcript) => {
      console.log('📝 Transcript received:', transcript);
      transcriptReceived = true;
    });

    rt.on('error', (error) => {
      console.error('❌ Realtime error:', error);
    });

    rt.on('close', () => {
      console.log('🔚 Connection closed');
      console.log('📊 Results:');
      console.log('  - Connected:', connected);
      console.log('  - Transcript received:', transcriptReceived);
      process.exit(connected ? 0 : 1);
    });

    console.log('🔌 Connecting to AssemblyAI...');
    await rt.connect();

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAssemblyAI();