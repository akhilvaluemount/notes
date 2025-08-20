import React, { useEffect, useRef } from 'react';
import './AudioLevelMeter.css';

const AudioLevelMeter = ({ 
  level = 0, 
  isVoiceActive = false, 
  noiseFloor = 0,
  voiceThreshold = 0.01,
  showThresholds = true 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, width, height);

      // Calculate level bar height (level is 0-1)
      const levelHeight = Math.min(level * height, height);

      // Draw level bar
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      if (isVoiceActive) {
        gradient.addColorStop(0, '#28a745'); // Green at bottom
        gradient.addColorStop(0.7, '#ffc107'); // Yellow in middle
        gradient.addColorStop(1, '#dc3545'); // Red at top
      } else {
        gradient.addColorStop(0, '#6c757d'); // Gray when no voice
        gradient.addColorStop(1, '#adb5bd');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, height - levelHeight, width, levelHeight);

      // Draw thresholds if enabled
      if (showThresholds) {
        // Voice threshold line
        const voiceThresholdY = height - (voiceThreshold * height);
        ctx.strokeStyle = isVoiceActive ? '#28a745' : '#ffc107';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(0, voiceThresholdY);
        ctx.lineTo(width, voiceThresholdY);
        ctx.stroke();

        // Noise floor line
        const noiseFloorY = height - (noiseFloor * height);
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, noiseFloorY);
        ctx.lineTo(width, noiseFloorY);
        ctx.stroke();

        // Reset line style
        ctx.setLineDash([]);
      }

      // Border
      ctx.strokeStyle = '#dee2e6';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);
    };

    draw();
    
    // Animate level changes
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level, isVoiceActive, noiseFloor, voiceThreshold, showThresholds]);

  return (
    <div className="audio-level-meter">
      <canvas
        ref={canvasRef}
        width={20}
        height={60}
        className="audio-level-canvas"
      />
      <div className="audio-level-status">
        <span className={`voice-indicator ${isVoiceActive ? 'active' : ''}`}>
          {isVoiceActive ? '🎙️' : '🔇'}
        </span>
        <span className="level-text">
          {Math.round(level * 100)}%
        </span>
      </div>
    </div>
  );
};

export default AudioLevelMeter;