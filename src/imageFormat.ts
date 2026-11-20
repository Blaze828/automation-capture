import * as path from 'path';

export type ImageFormat = 'png' | 'jpg' | 'webp';
export const imageFormats: readonly ImageFormat[] = ['png', 'jpg', 'webp'];

export function isImageFormat(value: unknown): value is ImageFormat {
  return imageFormats.includes(value as ImageFormat);
}

export function replImageFilename(value: string, format: ImageFormat): string {
  const name = value.trim();
  const suffix = `.${format}`;
  const hasSuffix = name.toLowerCase().endsWith(suffix);
  const base = hasSuffix ? name.slice(0, -suffix.length) : name;
  if (!base.trim()) { throw new Error('파일 이름을 입력하세요.'); }
  if (/[<>:"/\\|?*\x00-\x1f]/.test(base) || /[. ]$/.test(base)
    || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/i.test(base)) {
    throw new Error('파일 이름에 사용할 수 없는 문자 또는 이름입니다.');
  }
  if (!hasSuffix && isImageFormat(path.extname(base).slice(1).toLowerCase())) {
    throw new Error(`선택한 이미지 형식은 ${suffix}입니다. 확장자를 빼거나 ${suffix}로 입력하세요.`);
  }
  return base + suffix;
}

export function hasImageSignature(bytes: Buffer, format: ImageFormat): boolean {
  if (format === 'png') { return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); }
  if (format === 'jpg') { return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff; }
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}
