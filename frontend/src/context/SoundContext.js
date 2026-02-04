import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SoundContext = createContext(null);

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound deve essere usato dentro SoundProvider');
  }
  return context;
};

// WebAudio Synthesizer for tactical sounds
const createTacticalSound = (audioContext, type) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const now = audioContext.currentTime;
  
  switch (type) {
    case 'click':
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      break;
      
    case 'success':
      oscillator.frequency.setValueAtTime(523, now);
      oscillator.frequency.setValueAtTime(659, now + 0.1);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;
      
    case 'error':
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
      
    case 'alert':
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.setValueAtTime(440, now + 0.1);
      oscillator.frequency.setValueAtTime(880, now + 0.2);
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
      
    case 'notification':
      oscillator.frequency.setValueAtTime(1047, now);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;
      
    case 'dispatch':
      // Radio-like beep
      oscillator.frequency.setValueAtTime(1000, now);
      oscillator.frequency.setValueAtTime(1200, now + 0.05);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.setValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;
      
    default:
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
  }
};

export const SoundProvider = ({ children }) => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('plos_sound_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (user?.sound_enabled !== undefined) {
      setEnabled(user.sound_enabled);
    }
  }, [user?.sound_enabled]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const play = useCallback((soundType) => {
    if (!enabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      createTacticalSound(ctx, soundType);
    } catch (error) {
      console.warn('Errore riproduzione suono:', error);
    }
  }, [enabled, getAudioContext]);

  const toggle = useCallback((value) => {
    const newValue = value !== undefined ? value : !enabled;
    setEnabled(newValue);
    localStorage.setItem('plos_sound_enabled', String(newValue));
    
    if (newValue) {
      play('click');
    }
  }, [enabled, play]);

  return (
    <SoundContext.Provider
      value={{
        enabled,
        toggle,
        play,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
};

export default SoundContext;
