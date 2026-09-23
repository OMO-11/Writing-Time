/** Deterministic events sampled by the renderer's existing motion clock (seconds). */
const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
function random(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export function ambientHourOffset(time: number) {
  return .3 * Math.sin(time * Math.PI * 2 / 360);
}
export function createAmbientTimeline() {
  let blinkRandom = random(419), windRandom = random(821);
  const nextBlink = (start: number) => {
    const kind = blinkRandom();
    return { start, close: .11 + blinkRandom() * .03, hold: kind > .97 ? .17 + blinkRandom() * .07 : .03 + blinkRandom() * .03,
      open: .15 + blinkRandom() * .04, double: kind >= .85 && kind <= .97, gap: .12 + blinkRandom() * .06 };
  };
  let blink = nextBlink(3.5 + blinkRandom() * 4.5);
  let gust = { start: 15 + windRandom() * 25, duration: 2 + windRandom() * 2, strength: .35 + windRandom() * .15 };
  let windArea = 0, lastTime = 0;
  return (time: number) => {
    if (time < lastTime) {
      blinkRandom = random(419); windRandom = random(821);
      blink = nextBlink(3.5 + blinkRandom() * 4.5);
      gust = { start: 15 + windRandom() * 25, duration: 2 + windRandom() * 2, strength: .35 + windRandom() * .15 };
      windArea = 0;
    }
    lastTime = time;
    let length = blink.close + blink.hold + blink.open;
    while (time > blink.start + (blink.double ? length * 2 + blink.gap : length)) {
      blink = nextBlink(blink.start + (blink.double ? length * 2 + blink.gap : length) + 3.5 + blinkRandom() * 4.5);
      length = blink.close + blink.hold + blink.open;
    }
    const pulse = (age: number) => ease(age / blink.close) * (1 - ease((age - blink.close - blink.hold) / blink.open));
    const amount = Math.max(pulse(time - blink.start), blink.double ? pulse(time - blink.start - length - blink.gap) : 0);
    while (time > gust.start + gust.duration) {
      windArea += gust.strength * gust.duration / 2;
      gust = { start: gust.start + 15 + windRandom() * 25, duration: 2 + windRandom() * 2, strength: .35 + windRandom() * .15 };
    }
    const phase = Math.max(0, Math.min(1, (time - gust.start) / gust.duration));
    const wind = .15 + gust.strength * Math.sin(phase * Math.PI) ** 2;
    // Integrate wind velocity, rather than multiplying time by current force:
    // dust never jumps or reverses position when a gust subsides.
    const windTravel = .15 * time + windArea + gust.strength * gust.duration * (phase / 2 - Math.sin(phase * 2 * Math.PI) / (4 * Math.PI));
    return { blink: amount, wind, windTravel };
  };
}
