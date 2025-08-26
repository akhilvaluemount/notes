import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for tracking performance metrics
 * Monitors latency, audio quality, and transcription performance
 */
const usePerformanceMetrics = () => {
  // Latency metrics
  const [metrics, setMetrics] = useState({
    audioLatency: 0,
    transcriptionLatency: 0,
    aiResponseLatency: 0,
    endToEndLatency: 0,
    averageLatency: 0,
    // Audio quality metrics
    audioSampleRate: 16000,
    audioVolume: 0,
    noiseLevelDb: 0,
    signalToNoiseRatio: 0,
    audioDropouts: 0,
    // Transcription metrics
    wordsPerMinute: 0,
    charactersPerSecond: 0,
    partialUpdatesCount: 0,
    finalTranscriptsCount: 0,
    accuracyScore: 100,
    // Network metrics
    websocketPing: 0,
    websocketReconnects: 0,
    httpApiLatency: 0,
    networkErrors: 0,
    // System metrics
    cpuUsage: 0,
    memoryUsage: 0,
    sessionDuration: 0,
    timestamp: Date.now()
  });

  // History for charts
  const [metricsHistory, setMetricsHistory] = useState([]);
  const maxHistoryLength = 100; // Keep last 100 data points

  // Timing references
  const timingRefs = useRef({
    audioStartTime: null,
    transcriptionStartTime: null,
    aiRequestStartTime: null,
    sessionStartTime: Date.now(),
    lastWordTime: null,
    wordCount: 0,
    characterCount: 0
  });

  // Update interval
  const updateIntervalRef = useRef(null);

  /**
   * Start tracking audio processing
   */
  const startAudioTracking = useCallback(() => {
    timingRefs.current.audioStartTime = performance.now();
  }, []);

  /**
   * Record audio processing complete
   */
  const recordAudioProcessed = useCallback(() => {
    if (timingRefs.current.audioStartTime) {
      const latency = performance.now() - timingRefs.current.audioStartTime;
      setMetrics(prev => ({
        ...prev,
        audioLatency: Math.round(latency)
      }));
      timingRefs.current.audioStartTime = null;
    }
  }, []);

  /**
   * Start tracking transcription
   */
  const startTranscriptionTracking = useCallback(() => {
    timingRefs.current.transcriptionStartTime = performance.now();
  }, []);

  /**
   * Record transcription received
   */
  const recordTranscriptionReceived = useCallback((text, isPartial = false) => {
    if (timingRefs.current.transcriptionStartTime) {
      const latency = performance.now() - timingRefs.current.transcriptionStartTime;
      
      // Update word and character counts
      if (text) {
        const words = text.trim().split(/\s+/).length;
        const chars = text.length;
        timingRefs.current.wordCount += words;
        timingRefs.current.characterCount += chars;
        timingRefs.current.lastWordTime = Date.now();
      }
      
      setMetrics(prev => ({
        ...prev,
        transcriptionLatency: Math.round(latency),
        partialUpdatesCount: isPartial ? prev.partialUpdatesCount + 1 : prev.partialUpdatesCount,
        finalTranscriptsCount: !isPartial ? prev.finalTranscriptsCount + 1 : prev.finalTranscriptsCount
      }));
      
      if (!isPartial) {
        timingRefs.current.transcriptionStartTime = null;
      }
    }
  }, []);

  /**
   * Start tracking AI response
   */
  const startAITracking = useCallback(() => {
    timingRefs.current.aiRequestStartTime = performance.now();
  }, []);

  /**
   * Record AI response received
   */
  const recordAIResponseReceived = useCallback(() => {
    if (timingRefs.current.aiRequestStartTime) {
      const latency = performance.now() - timingRefs.current.aiRequestStartTime;
      setMetrics(prev => ({
        ...prev,
        aiResponseLatency: Math.round(latency)
      }));
      timingRefs.current.aiRequestStartTime = null;
    }
  }, []);

  /**
   * Update audio quality metrics
   */
  const updateAudioQuality = useCallback((audioData) => {
    if (!audioData || audioData.length === 0) return;
    
    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    const volumeDb = 20 * Math.log10(rms + 0.0001); // Add small value to avoid log(0)
    
    // Estimate noise level (simplified - uses minimum values)
    const sortedData = [...audioData].sort((a, b) => Math.abs(a) - Math.abs(b));
    const noiseFloor = sortedData[Math.floor(sortedData.length * 0.1)]; // 10th percentile
    const noiseDb = 20 * Math.log10(Math.abs(noiseFloor) + 0.0001);
    
    // Calculate SNR
    const snr = volumeDb - noiseDb;
    
    setMetrics(prev => ({
      ...prev,
      audioVolume: Math.max(-60, Math.min(0, volumeDb)), // Clamp to reasonable range
      noiseLevelDb: Math.max(-80, Math.min(0, noiseDb)),
      signalToNoiseRatio: Math.max(0, Math.min(60, snr))
    }));
  }, []);

  /**
   * Update network metrics
   */
  const updateNetworkMetrics = useCallback((ping, reconnects = 0, errors = 0) => {
    setMetrics(prev => ({
      ...prev,
      websocketPing: ping,
      websocketReconnects: prev.websocketReconnects + reconnects,
      networkErrors: prev.networkErrors + errors
    }));
  }, []);

  /**
   * Calculate words per minute
   */
  const calculateWPM = useCallback(() => {
    const sessionMinutes = (Date.now() - timingRefs.current.sessionStartTime) / 60000;
    if (sessionMinutes > 0) {
      const wpm = Math.round(timingRefs.current.wordCount / sessionMinutes);
      setMetrics(prev => ({
        ...prev,
        wordsPerMinute: wpm
      }));
    }
  }, []);

  /**
   * Calculate characters per second
   */
  const calculateCPS = useCallback(() => {
    const sessionSeconds = (Date.now() - timingRefs.current.sessionStartTime) / 1000;
    if (sessionSeconds > 0) {
      const cps = Math.round(timingRefs.current.characterCount / sessionSeconds);
      setMetrics(prev => ({
        ...prev,
        charactersPerSecond: cps
      }));
    }
  }, []);

  /**
   * Update accuracy score (mock implementation - would need reference text)
   */
  const updateAccuracyScore = useCallback((score) => {
    setMetrics(prev => ({
      ...prev,
      accuracyScore: Math.max(0, Math.min(100, score))
    }));
  }, []);

  /**
   * Calculate average latencies
   */
  const calculateAverages = useCallback(() => {
    setMetrics(prev => {
      const avgLatency = Math.round(
        (prev.audioLatency + prev.transcriptionLatency + prev.aiResponseLatency) / 3
      );
      const endToEnd = prev.audioLatency + prev.transcriptionLatency + prev.aiResponseLatency;
      
      return {
        ...prev,
        averageLatency: avgLatency,
        endToEndLatency: endToEnd,
        sessionDuration: Math.round((Date.now() - timingRefs.current.sessionStartTime) / 1000)
      };
    });
  }, []);

  /**
   * Add current metrics to history
   */
  const updateHistory = useCallback(() => {
    setMetricsHistory(prev => {
      const newHistory = [...prev, { ...metrics, timestamp: Date.now() }];
      // Keep only last N entries
      if (newHistory.length > maxHistoryLength) {
        return newHistory.slice(-maxHistoryLength);
      }
      return newHistory;
    });
  }, [metrics]);

  /**
   * Get system performance (simplified)
   */
  const updateSystemMetrics = useCallback(() => {
    // Estimate memory usage (simplified)
    if (performance.memory) {
      const memoryUsage = Math.round(
        (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      );
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memoryUsage
      }));
    }
  }, []);

  /**
   * Reset all metrics
   */
  const resetMetrics = useCallback(() => {
    timingRefs.current = {
      audioStartTime: null,
      transcriptionStartTime: null,
      aiRequestStartTime: null,
      sessionStartTime: Date.now(),
      lastWordTime: null,
      wordCount: 0,
      characterCount: 0
    };
    
    setMetrics({
      audioLatency: 0,
      transcriptionLatency: 0,
      aiResponseLatency: 0,
      endToEndLatency: 0,
      averageLatency: 0,
      audioSampleRate: 16000,
      audioVolume: 0,
      noiseLevelDb: 0,
      signalToNoiseRatio: 0,
      audioDropouts: 0,
      wordsPerMinute: 0,
      charactersPerSecond: 0,
      partialUpdatesCount: 0,
      finalTranscriptsCount: 0,
      accuracyScore: 100,
      websocketPing: 0,
      websocketReconnects: 0,
      httpApiLatency: 0,
      networkErrors: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      sessionDuration: 0,
      timestamp: Date.now()
    });
    
    setMetricsHistory([]);
  }, []);

  /**
   * Get formatted metrics for display
   */
  const getFormattedMetrics = useCallback(() => {
    return {
      latency: {
        audio: `${metrics.audioLatency}ms`,
        transcription: `${metrics.transcriptionLatency}ms`,
        ai: `${metrics.aiResponseLatency}ms`,
        total: `${metrics.endToEndLatency}ms`,
        average: `${metrics.averageLatency}ms`
      },
      audio: {
        sampleRate: `${metrics.audioSampleRate / 1000}kHz`,
        volume: `${metrics.audioVolume.toFixed(1)}dB`,
        noise: `${metrics.noiseLevelDb.toFixed(1)}dB`,
        snr: `${metrics.signalToNoiseRatio.toFixed(1)}dB`,
        dropouts: metrics.audioDropouts
      },
      transcription: {
        wpm: metrics.wordsPerMinute,
        cps: metrics.charactersPerSecond,
        partials: metrics.partialUpdatesCount,
        finals: metrics.finalTranscriptsCount,
        accuracy: `${metrics.accuracyScore}%`
      },
      network: {
        ping: `${metrics.websocketPing}ms`,
        reconnects: metrics.websocketReconnects,
        apiLatency: `${metrics.httpApiLatency}ms`,
        errors: metrics.networkErrors
      },
      system: {
        memory: `${metrics.memoryUsage}%`,
        session: `${Math.floor(metrics.sessionDuration / 60)}:${(metrics.sessionDuration % 60).toString().padStart(2, '0')}`
      }
    };
  }, [metrics]);

  // Set up periodic updates
  useEffect(() => {
    updateIntervalRef.current = setInterval(() => {
      calculateWPM();
      calculateCPS();
      calculateAverages();
      updateSystemMetrics();
      updateHistory();
    }, 1000); // Update every second

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [calculateWPM, calculateCPS, calculateAverages, updateSystemMetrics, updateHistory]);

  return {
    metrics,
    metricsHistory,
    formattedMetrics: getFormattedMetrics(),
    // Tracking functions
    startAudioTracking,
    recordAudioProcessed,
    startTranscriptionTracking,
    recordTranscriptionReceived,
    startAITracking,
    recordAIResponseReceived,
    // Update functions
    updateAudioQuality,
    updateNetworkMetrics,
    updateAccuracyScore,
    // Utility functions
    resetMetrics
  };
};

export default usePerformanceMetrics;