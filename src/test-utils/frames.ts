/**
 * Shared test frame factories.
 * Centralized here to eliminate cross-file duplication in *.test.ts.
 */

export function makeFrame(
  w: number,
  h: number,
  r = 0,
  g = 0,
  b = 0,
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h * 4; i += 4) {
    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
    data[i + 3] = 255
  }
  return new ImageData(data, w, h)
}

export function makeGradient(w: number, h: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.round((x / (w - 1)) * 255)
      const i = (y * w + x) * 4
      data[i] = v
      data[i + 1] = v
      data[i + 2] = v
      data[i + 3] = 255
    }
  }
  return new ImageData(data, w, h)
}

export function makeStripeFrame(
  w: number,
  h: number,
  stripeY: number,
  bgR = 200,
  stripeR = 30,
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const isStripe = y === stripeY
      data[idx] = isStripe ? stripeR : bgR
      data[idx + 1] = isStripe ? stripeR : bgR
      data[idx + 2] = isStripe ? stripeR : bgR
      data[idx + 3] = 255
    }
  }
  return new ImageData(data, w, h)
}

export function makeHighVarianceFrame(w: number, h: number): ImageData {
  const frame = makeFrame(w, h, 128, 128, 128)
  // 4px stripes so step=2 sampling captures both values
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const val = Math.floor(x / 4) % 2 === 0 ? 0 : 255
      frame.data[idx] = val
      frame.data[idx + 1] = val
      frame.data[idx + 2] = val
    }
  }
  return frame
}
