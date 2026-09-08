// HTML5 Web Audio API Synthesizer for Task Reminders and Alerts
// No external assets required, immune to CORS or slow networks.

let activeOscillators: { oscs: OscillatorNode[]; gain: GainNode; ctx: AudioContext; intervalId?: any }[] = [];

export function stopAllAlarmSounds() {
  activeOscillators.forEach(item => {
    try {
      if (item.intervalId) {
        clearInterval(item.intervalId);
      }
      item.oscs.forEach(o => {
        try {
          o.stop();
        } catch (e) {}
      });
      item.gain.disconnect();
      if (item.ctx.state !== 'closed') {
        item.ctx.close();
      }
    } catch (e) {
      console.warn("Error cleaning up audio nodes:", e);
    }
  });
  activeOscillators = [];
}

export function playAlarmSound(type: 'digital' | 'bell' | 'marimba' | 'classic', volume = 0.5): () => void {
  // Stop existing sounds first to avoid overlaps
  stopAllAlarmSounds();

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    console.warn("Web Audio API is not supported in this browser.");
    return () => {};
  }

  const ctx = new AudioContextClass();
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(volume, ctx.currentTime);
  mainGain.connect(ctx.destination);

  const oscs: OscillatorNode[] = [];
  let intervalId: any;

  if (type === 'digital') {
    // Clean, crisp high pitch double-beep
    const playBeep = () => {
      const playSingleBeep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(950, ctx.currentTime + timeOffset);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + timeOffset + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.15);

        osc.connect(gainNode);
        gainNode.connect(mainGain);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.16);
        oscs.push(osc);
      };
      
      playSingleBeep(0);
      playSingleBeep(0.18);
    };

    playBeep();
    intervalId = setInterval(playBeep, 1100);

  } else if (type === 'bell') {
    // Beautiful pure brass bell resonant tone chime
    const playDong = () => {
      const frequencies = [659.25, 987.77, 1318.51]; // E5, B5, E6 harmonic blend
      const now = ctx.currentTime;
      
      frequencies.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        
        const initialVol = idx === 0 ? 0.35 : idx === 1 ? 0.2 : 0.08;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(initialVol, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + (1.6 / (idx + 1)));

        osc.connect(gainNode);
        gainNode.connect(mainGain);
        osc.start(now);
        osc.stop(now + 2.0);
        oscs.push(osc);
      });
    };

    playDong();
    intervalId = setInterval(playDong, 2500);

  } else if (type === 'marimba') {
    // Playful, cheerful, high-contrast cascading arpeggio
    const playArp = () => {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const playTime = now + (idx * 0.1);
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, playTime);
        
        gainNode.gain.setValueAtTime(0, playTime);
        gainNode.gain.linearRampToValueAtTime(0.25, playTime + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.001, playTime + 0.35);

        osc.connect(gainNode);
        gainNode.connect(mainGain);
        osc.start(playTime);
        osc.stop(playTime + 0.4);
        oscs.push(osc);
      });
    };

    playArp();
    intervalId = setInterval(playArp, 1800);

  } else {
    // 'classic' old retro school telephone sound
    const playClassic = () => {
      const now = ctx.currentTime;
      for (let i = 0; i < 12; i++) {
        const playTime = now + (i * 0.07);
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Two oscillators beat pattern for ringing effect
        osc.frequency.setValueAtTime(450, playTime);
        osc.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, playTime);
        gainNode.gain.linearRampToValueAtTime(0.18, playTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, playTime + 0.06);

        osc.connect(gainNode);
        gainNode.connect(mainGain);
        
        osc.start(playTime);
        osc.stop(playTime + 0.08);
        oscs.push(osc);
      }
    };

    playClassic();
    intervalId = setInterval(playClassic, 2800);
  }

  const token = { oscs, gain: mainGain, ctx, intervalId };
  activeOscillators.push(token);

  return () => {
    clearInterval(intervalId);
    try {
      oscs.forEach(o => {
        try { o.stop(); } catch {}
      });
      mainGain.disconnect();
      if (ctx.state !== 'closed') { ctx.close(); }
    } catch {}
    activeOscillators = activeOscillators.filter(item => item !== token);
  };
}
