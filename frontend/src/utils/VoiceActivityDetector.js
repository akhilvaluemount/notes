class VoiceActivityDetector {
  constructor(options = {}) {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
    
    // Configuration options
    this.options = {
      fftSize: options.fftSize || 2048,
      smoothingTimeConstant: options.smoothingTimeConstant || 0.3,
      minDecibels: options.minDecibels || -90,
      maxDecibels: options.maxDecibels || -10,
      
      // Voice activity thresholds - STRICTER VALUES
      voiceThreshold: options.voiceThreshold || 0.03, // Increased from 0.01
      noiseFloor: options.noiseFloor || 0.015, // Increased from 0.005
      absoluteMinThreshold: options.absoluteMinThreshold || 0.025, // New absolute minimum
      minSpeechDuration: options.minSpeechDuration || 1000, // Min speech duration in ms
      maxSilenceDuration: options.maxSilenceDuration || 3000, // Max silence before stopping in ms
      
      // Enhanced detection parameters
      minSpeechPercentage: options.minSpeechPercentage || 0.4, // Increased from 0.2
      minSignalToNoise: options.minSignalToNoise || 6, // Minimum SNR in dB
      maxSilencePercentage: options.maxSilencePercentage || 0.7, // Max 70% silence allowed
      
      // Sensitivity levels: 'low', 'medium', 'high', 'very-high'
      sensitivity: options.sensitivity || 'high',
      
      // Callback functions
      onVoiceStart: options.onVoiceStart || (() => {}),
      onVoiceEnd: options.onVoiceEnd || (() => {}),
      onAudioLevel: options.onAudioLevel || (() => {}),
    };
    
    // State tracking
    this.isVoiceActive = false;
    this.voiceStartTime = null;
    this.lastVoiceTime = null;
    this.noiseFloorSamples = [];
    this.maxNoiseFloorSamples = 100;
    
    // Audio level history for analysis
    this.audioLevels = [];
    this.maxAudioHistory = 150; // Increased for better 5-second chunk analysis
    
    // Additional metrics tracking
    this.frequencyData = [];
    this.zeroCrossingRates = [];
    this.peakLevels = [];
    
    this.isAnalyzing = false;
  }
  
  async initialize(mediaStream) {
    try {
      this.stream = mediaStream;
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.options.fftSize;
      this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
      this.analyser.minDecibels = this.options.minDecibels;
      this.analyser.maxDecibels = this.options.maxDecibels;
      
      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(mediaStream);
      source.connect(this.analyser);
      
      console.log('VoiceActivityDetector initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize VoiceActivityDetector:', error);
      return false;
    }
  }
  
  startAnalysis() {
    if (!this.audioContext || !this.analyser) {
      console.error('VoiceActivityDetector not initialized');
      return;
    }
    
    this.isAnalyzing = true;
    this.analyzeAudio();
  }
  
  stopAnalysis() {
    this.isAnalyzing = false;
  }
  
  analyzeAudio() {
    if (!this.isAnalyzing || !this.analyser) {
      return;
    }
    
    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate RMS (Root Mean Square) energy level
    const rmsLevel = this.calculateRMS(this.dataArray);
    
    // Calculate speech frequency energy (300-3400 Hz range)
    const speechEnergy = this.calculateSpeechFrequencyEnergy();
    
    // Use weighted combination of overall RMS and speech frequency energy
    const weightedLevel = (rmsLevel * 0.6) + (speechEnergy * 0.4);
    
    // Update audio level history
    this.audioLevels.push(weightedLevel);
    if (this.audioLevels.length > this.maxAudioHistory) {
      this.audioLevels.shift();
    }
    
    // Update noise floor estimation
    this.updateNoiseFloor(rmsLevel);
    
    // Determine if voice is active
    const currentTime = Date.now();
    const isVoice = this.isVoiceDetected(rmsLevel);
    
    // Call audio level callback
    this.options.onAudioLevel(rmsLevel, isVoice);
    
    // Handle voice activity state changes
    if (isVoice && !this.isVoiceActive) {
      // Voice started
      this.isVoiceActive = true;
      this.voiceStartTime = currentTime;
      this.lastVoiceTime = currentTime;
      this.options.onVoiceStart();
    } else if (isVoice && this.isVoiceActive) {
      // Voice continuing
      this.lastVoiceTime = currentTime;
    } else if (!isVoice && this.isVoiceActive) {
      // Check if silence has been too long
      const silenceDuration = currentTime - this.lastVoiceTime;
      if (silenceDuration > this.options.maxSilenceDuration) {
        // Voice ended
        this.isVoiceActive = false;
        this.voiceStartTime = null;
        this.options.onVoiceEnd();
      }
    }
    
    // Continue analyzing
    requestAnimationFrame(() => this.analyzeAudio());
  }
  
  calculateRMS(dataArray) {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255.0; // Normalize to 0-1
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }
  
  calculateSpeechFrequencyEnergy() {
    // Calculate energy in speech frequency range (300-3400 Hz)
    // Assuming 44100 Hz sample rate
    const sampleRate = this.audioContext.sampleRate;
    const binWidth = sampleRate / this.analyser.fftSize;
    
    // Calculate bin indices for speech range
    const minBin = Math.floor(300 / binWidth);
    const maxBin = Math.ceil(3400 / binWidth);
    
    let speechSum = 0;
    let speechCount = 0;
    
    for (let i = minBin; i <= maxBin && i < this.dataArray.length; i++) {
      const normalized = this.dataArray[i] / 255.0;
      speechSum += normalized * normalized;
      speechCount++;
    }
    
    return speechCount > 0 ? Math.sqrt(speechSum / speechCount) : 0;
  }
  
  updateNoiseFloor(level) {
    // Add to noise floor samples if it's likely background noise
    if (!this.isVoiceActive && level > 0) {
      this.noiseFloorSamples.push(level);
      if (this.noiseFloorSamples.length > this.maxNoiseFloorSamples) {
        this.noiseFloorSamples.shift();
      }
      
      // Update noise floor as average of recent quiet samples
      if (this.noiseFloorSamples.length > 10) {
        const sortedSamples = [...this.noiseFloorSamples].sort((a, b) => a - b);
        // Use median of lower quartile as noise floor
        const quartileIndex = Math.floor(sortedSamples.length * 0.25);
        this.options.noiseFloor = sortedSamples[quartileIndex];
      }
    }
  }
  
  isVoiceDetected(level) {
    // Apply sensitivity-based thresholds
    let multiplier = 3; // Default for 'high' sensitivity
    switch (this.options.sensitivity) {
      case 'low':
        multiplier = 2;
        break;
      case 'medium':
        multiplier = 2.5;
        break;
      case 'high':
        multiplier = 3;
        break;
      case 'very-high':
        multiplier = 4;
        break;
    }
    
    // Voice detected if level is above threshold and significantly above noise floor
    const noiseMargin = this.options.noiseFloor * multiplier;
    const threshold = Math.max(
      this.options.voiceThreshold, 
      noiseMargin,
      this.options.absoluteMinThreshold // Never go below absolute minimum
    );
    
    return level > threshold;
  }
  
  hasValidSpeech() {
    if (!this.isVoiceActive || !this.voiceStartTime) {
      return false;
    }
    
    const speechDuration = Date.now() - this.voiceStartTime;
    return speechDuration >= this.options.minSpeechDuration;
  }
  
  getAudioLevel() {
    return this.audioLevels.length > 0 ? this.audioLevels[this.audioLevels.length - 1] : 0;
  }
  
  getAverageAudioLevel() {
    if (this.audioLevels.length === 0) return 0;
    const sum = this.audioLevels.reduce((a, b) => a + b, 0);
    return sum / this.audioLevels.length;
  }
  
  getSpeechPercentage() {
    if (this.audioLevels.length < 5) return 0; // Need some samples
    
    const voiceSamples = this.audioLevels.filter(level => 
      this.isVoiceDetected(level)
    ).length;
    
    return voiceSamples / this.audioLevels.length;
  }
  
  shouldProcessChunk() {
    // Enhanced decision logic with multiple validation checks
    const speechPercentage = this.getSpeechPercentage();
    const averageLevel = this.getAverageAudioLevel();
    const maxLevel = Math.max(...this.audioLevels);
    
    // Calculate signal-to-noise ratio
    const snr = this.calculateSNR(averageLevel);
    
    // Calculate silence percentage
    const silencePercentage = this.audioLevels.filter(level => 
      level < this.options.noiseFloor * 1.2
    ).length / this.audioLevels.length;
    
    // Multiple validation checks
    const checks = {
      hasSufficientSpeech: speechPercentage >= this.options.minSpeechPercentage,
      hasGoodSNR: snr >= this.options.minSignalToNoise,
      notTooMuchSilence: silencePercentage <= this.options.maxSilencePercentage,
      hasMinimumLevel: averageLevel > this.options.absoluteMinThreshold,
      hasPeaks: maxLevel > this.options.voiceThreshold * 2,
      aboveNoiseFloor: averageLevel > this.options.noiseFloor * 2.5
    };
    
    // Log detailed metrics for debugging
    console.log('VAD Chunk Analysis:', {
      speechPercentage: Math.round(speechPercentage * 100) + '%',
      averageLevel: averageLevel.toFixed(4),
      maxLevel: maxLevel.toFixed(4),
      snr: snr.toFixed(1) + 'dB',
      silencePercentage: Math.round(silencePercentage * 100) + '%',
      checks,
      willProcess: Object.values(checks).every(v => v)
    });
    
    // All checks must pass
    return Object.values(checks).every(check => check);
  }
  
  calculateSNR(signal) {
    // Calculate Signal-to-Noise Ratio in dB
    if (this.options.noiseFloor === 0) return 0;
    const ratio = signal / this.options.noiseFloor;
    return 20 * Math.log10(Math.max(ratio, 0.001)); // Prevent log(0)
  }
  
  reset() {
    this.isVoiceActive = false;
    this.voiceStartTime = null;
    this.lastVoiceTime = null;
    this.audioLevels = [];
  }
  
  destroy() {
    this.stopAnalysis();
    
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.stream = null;
  }
}

export default VoiceActivityDetector;