import React from 'react';
import './AudioRecorder.css';

const AudioRecorder = ({ isRecording, onStart, onStop, isProcessing }) => {
  return (
    <div className="audio-recorder">
      {!isRecording ? (
        <button 
          onClick={onStart} 
          className="btn btn-success"
          disabled={isProcessing}
        >
          Start Recording
        </button>
      ) : (
        <>
          <button 
            onClick={onStop} 
            className="btn btn-danger"
          >
            Stop Recording
          </button>
          <span className="recording-indicator">
            Recording...
          </span>
        </>
      )}
      {isProcessing && (
        <span className="processing-indicator">
          Processing...
        </span>
      )}
    </div>
  );
};

export default AudioRecorder;