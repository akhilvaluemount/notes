import React from 'react';
import './AudioRecorder.css';

const AudioRecorder = ({ isRecording, onStart, onStop, isProcessing }) => {
  return (
    <div className="audio-recorder">
      {!isRecording ? (
        <button 
          onClick={onStart} 
          className="btn-icon btn-icon-success"
          disabled={isProcessing}
          title="Start Recording"
        >
          🎙️
        </button>
      ) : (
        <button 
          onClick={onStop} 
          className="btn-icon btn-icon-danger recording-pulse"
          title="Stop Recording"
        >
          🛑
        </button>
      )}
    </div>
  );
};

export default AudioRecorder;