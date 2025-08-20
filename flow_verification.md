# Flow Verification Test

## Step-by-Step Verification

### 1. Frontend → Backend (Audio Capture)
- ✅ Microphone access working
- ✅ Audio data being captured (32768 bytes chunks)
- ✅ Audio data being sent to WebSocket

### 2. Backend Proxy → AssemblyAI
Check bash_16 logs for:
- Client connection
- AssemblyAI session establishment
- Audio data forwarding

### 3. AssemblyAI → Backend (Transcription Response)
Look for:
- Transcript events
- Turn events
- Partial/Final transcripts

### 4. Backend → Frontend (Response Forwarding)
Check for:
- custom_transcription_partial messages
- custom_transcription_final messages

### 5. Frontend UI Display
Check console logs for:
- State updates
- Component re-renders
- Debug panel updates

## Test Commands:

1. Refresh browser
2. Open console (F12)
3. Click Record button
4. Speak clearly: "Hello, this is a test of voice transcription"
5. Check each step in logs

## Expected Log Flow:
```
Frontend: 📤 useRealtimeTranscription: Sent X bytes of audio data to WebSocket
Backend: 📤 Received X bytes of audio from client
Backend: 🎵 Audio sent to AssemblyAI
Backend: 📝 Transcript event
Frontend: TranscriptPanel props updated with new text
```