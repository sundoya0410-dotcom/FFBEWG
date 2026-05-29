export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.round(ms)));
}

export function pickAlive(list) {
  return list.filter((item) => item.hp > 0);
}

export function createImg(candidates, alt) {
  const img = document.createElement('img');
  img.alt = alt;
  img.draggable = false;
  let pointer = 0;
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const useNext = () => {
    if (pointer >= list.length) return;
    img.src = list[pointer];
    pointer += 1;
  };
  img.addEventListener('error', useNext);
  useNext();
  return img;
}

// GIF 파일의 총 재생 시간(ms) + 프레임별 딜레이 파싱
const _gifCache = new Map();

export async function measureGifDuration(src) {
  const data = await _getGifFrames(src);
  return data ? data.totalMs : 0;
}

export async function getGifFrameDelays(src) {
  const data = await _getGifFrames(src);
  return data ? data.delays : [];
}

async function _getGifFrames(src) {
  if (_gifCache.has(src)) return _gifCache.get(src);
  try {
    const res = await fetch(src);
    const buf = await res.arrayBuffer();
    const data = new Uint8Array(buf);
    const delays = [];
    let totalMs = 0;
    let i = 6;
    const flags = data[i]; i += 3;
    if (flags & 0x80) i += 3 * (2 ** ((flags & 0x07) + 1));

    while (i < data.length) {
      if (data[i] === 0x3B) break;
      if (data[i] === 0x21) {
        i++;
        if (data[i] === 0xF9) {
          i++;
          const bs = data[i]; i++;
          if (bs >= 4) {
            const delay = Math.max(data[i+1] | (data[i+2] << 8), 2) * 10;
            delays.push(delay);
            totalMs += delay;
          }
          i += bs + 1;
        } else {
          i++;
          while (i < data.length && data[i] !== 0) i += data[i] + 1;
          i++;
        }
      } else if (data[i] === 0x2C) {
        i += 9;
        const lf = data[i]; i++;
        if (lf & 0x80) i += 3 * (2 ** ((lf & 0x07) + 1));
        i++;
        while (i < data.length && data[i] !== 0) i += data[i] + 1;
        i++;
      } else {
        i++;
      }
    }
    const result = { totalMs, delays };
    _gifCache.set(src, result);
    return result;
  } catch {
    return null;
  }
}

// GIF 재생 완료까지 대기 — 측정값 기반, 최소/최대 범위 보정
export async function waitForGif(actor, minMs = 200, maxMs = 8000) {
  // gifDurationPromise가 있으면 측정 완료 후 정확한 시간 대기
  let ms = 0;
  if (actor.gifDurationPromise) {
    ms = await actor.gifDurationPromise;
  } else {
    ms = actor.gifDuration || 0;
  }
  const clamped = Math.min(Math.max(ms || minMs, minMs), maxMs);
  await wait(clamped);
}
