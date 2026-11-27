/** Remove the opaque white matte from a raster clipboard chart. */
export function clearPastedChartMatte({data,width,height}: Pick<ImageData,'data'|'width'|'height'>) {
  if (width < 3 || height < 3) return false;
  const white = (pixel: number) => {
    const offset = pixel * 4;
    return data[offset] === 255 && data[offset + 1] === 255 &&
      data[offset + 2] === 255 && data[offset + 3] === 255;
  };

  // A complete white border identifies the export matte. Leave native
  // transparency, busy borders and differently colored backgrounds alone.
  for (let x = 0; x < width; x++) {
    if (!white(x) || !white((height - 1) * width + x)) return false;
  }
  for (let y = 1; y < height - 1; y++) {
    if (!white(y * width) || !white(y * width + width - 1)) return false;
  }

  let left = width, right = 0, top = height, bottom = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixel = y * width + x;
      if (data[pixel * 4 + 3] !== 255) return false;
      if (white(pixel)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (left > right) return false;

  // Clear connected white regions so isolated white labels and shapes survive.
  const pixels = new Uint32Array(width * height);
  let length = 0;
  const visit = (pixel: number) => {
    if (!white(pixel)) return;
    data[pixel * 4 + 3] = 0;
    pixels[length++] = pixel;
  };
  const clearRegion = (start: number) => {
    length = 0;
    visit(start);
    for (let index = 0; index < length; index++) {
      const pixel = pixels[index];
      const x = pixel % width;
      if (x > 0) visit(pixel - 1);
      if (x < width - 1) visit(pixel + 1);
      if (pixel >= width) visit(pixel - width);
      if (pixel < (height - 1) * width) visit(pixel + width);
    }
  };
  clearRegion(0);

  // A doughnut's central opening is the other part of the matte. Check
  // its shape and placement before clearing enclosed white pixels.
  const w = right - left + 1, h = bottom - top + 1;
  const centerX = Math.round((left + right) / 2);
  const centerY = Math.round((top + bottom) / 2);
  const center = centerY * width + centerX;
  if (Math.min(w,h) < .9 * Math.max(w,h) || !white(center)) return true;
  clearRegion(center);
  let innerLeft = width, innerRight = 0, innerTop = height, innerBottom = 0;
  for (let index = 0; index < length; index++) {
    const pixel = pixels[index];
    const x = pixel % width, y = Math.floor(pixel / width);
    innerLeft = Math.min(innerLeft, x);
    innerRight = Math.max(innerRight, x);
    innerTop = Math.min(innerTop, y);
    innerBottom = Math.max(innerBottom, y);
  }
  const innerWidth = innerRight - innerLeft + 1, innerHeight = innerBottom - innerTop + 1;
  const coverage = length / (innerWidth * innerHeight);
  const centered = Math.abs((innerLeft + innerRight) / 2 - centerX) <= .05 * w &&
    Math.abs((innerTop + innerBottom) / 2 - centerY) <= .05 * h;
  const round = Math.min(innerWidth,innerHeight) >= .9 * Math.max(innerWidth,innerHeight) &&
    coverage >= .66 && coverage <= .87;
  if (!centered || !round || innerWidth < .2 * w || innerWidth > .8 * w) {
    for (let index = 0; index < length; index++) data[pixels[index] * 4 + 3] = 255;
  }
  return true;
}
