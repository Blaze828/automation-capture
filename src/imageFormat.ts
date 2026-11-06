export type ImageFormat = 'png' | 'jpg' | 'webp';
export const imageFormats: readonly ImageFormat[] = ['png', 'jpg', 'webp'];

export function isImageFormat(value: unknown): value is ImageFormat {
  return imageFormats.includes(value as ImageFormat);
}

export function hasImageSignature(bytes: Buffer, format: ImageFormat): boolean {
  if (format === 'png') { return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); }
  if (format === 'jpg') { return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}
