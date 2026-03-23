// Notification sound & tab flashing effects

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Warm up AudioContext on first user interaction.
 * Browsers block audio until user has clicked/typed at least once.
 * Call this once from a top-level component.
 */
export function initAudioOnInteraction() {
  if (typeof window === "undefined" || audioUnlocked) return;

  const unlock = () => {
    if (audioUnlocked) return;
    const ctx = getAudioContext();
    if (ctx) {
      // Play a silent buffer to unlock audio
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      audioUnlocked = true;
    }
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("click", unlock, { once: false });
  window.addEventListener("keydown", unlock, { once: false });
  window.addEventListener("touchstart", unlock, { once: false });
}

/**
 * Play a short, clean notification sound using Web Audio API.
 * Two-tone chime: C5 → E5, soft and non-intrusive.
 */
export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Gain envelope
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  // First tone - C5 (523 Hz)
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(523, now);
  osc1.connect(gain);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // Second tone - E5 (659 Hz), slightly delayed
  const gain2 = ctx.createGain();
  gain2.connect(ctx.destination);
  gain2.gain.setValueAtTime(0, now + 0.1);
  gain2.gain.linearRampToValueAtTime(0.12, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(659, now + 0.1);
  osc2.connect(gain2);
  osc2.start(now + 0.1);
  osc2.stop(now + 0.5);
}

const ORIGINAL_TITLE = "Flarify — Social Network for Prediction Market Traders";
let flashInterval: NodeJS.Timeout | null = null;
let isFlashing = false;

/**
 * Start flashing the browser tab title with unread count.
 * Like Telegram - alternates between notification text and original title.
 */
export function startTitleFlash(unreadCount: number) {
  // Don't flash if tab is focused
  if (document.hasFocus()) return;

  stopTitleFlash();
  isFlashing = true;

  const notifText = unreadCount === 1
    ? `(1) New notification`
    : `(${unreadCount > 99 ? "99+" : unreadCount}) New notifications`;

  let showNotif = true;
  document.title = notifText;

  flashInterval = setInterval(() => {
    showNotif = !showNotif;
    document.title = showNotif ? notifText : ORIGINAL_TITLE;
  }, 1500);
}

/**
 * Stop flashing and restore the original title.
 */
export function stopTitleFlash() {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  if (isFlashing) {
    document.title = ORIGINAL_TITLE;
    isFlashing = false;
  }
}

/**
 * Returns true if tab flashing is currently active.
 */
export function isTabFlashing(): boolean {
  return isFlashing;
}
