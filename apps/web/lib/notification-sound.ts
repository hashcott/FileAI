// Audio context singleton to avoid creating multiple contexts
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        
        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
        
        return audioContext;
    } catch (e) {
        console.warn("Audio context not available:", e);
        return null;
    }
}

// Simple notification sound using Web Audio API
export function playNotificationSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    } catch (e) {
        console.warn("Failed to play notification sound:", e);
    }
}

// Success sound - pleasant two-tone chime
export function playSuccessSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const now = ctx.currentTime;
        
        const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = ctx!.createOscillator();
            const gainNode = ctx!.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx!.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = "sine";
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        // Pleasant two-tone success sound
        playTone(523.25, now, 0.2); // C5
        playTone(659.25, now + 0.1, 0.2); // E5
    } catch (e) {
        console.warn("Failed to play success sound:", e);
    }
}

// Error sound - lower, warning tone
export function playErrorSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 300;
        oscillator.type = "sawtooth";
        
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    } catch (e) {
        console.warn("Failed to play error sound:", e);
    }
}

