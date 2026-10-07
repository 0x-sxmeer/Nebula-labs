
import confetti from 'canvas-confetti';

export const celebrateSwapSuccess = (amount, token) => {
  // First burst - from bottom center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.8 },
    colors: ['#FF6B35', '#F7931A', '#FFD700'],
    disableForReducedMotion: true
  });
  
  // Second burst - from sides (delayed for impact)
  setTimeout(() => {
    // Left side
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#00E5FF', '#2979FF', '#651FFF']
    });
    // Right side
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#00E5FF', '#2979FF', '#651FFF']
    });
  }, 300);

  // Optional: Play success sound (ensure file exists or handle error gracefully)
  try {
    const audio = new Audio('/sounds/success.mp3'); 
    audio.volume = 0.3;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Auto-play was prevented
        console.log('Audio playback prevented:', error);
      });
    }
  } catch (e) {
    console.log('Audio playback error:', e);
  }
};
