import {tr} from './i18n';

/** Shrinks a photo to at most `max` px on its long side and re-encodes it as JPEG (also strips location data). */
export async function compressPhoto(file: File, max = 1600, quality = 0.84): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode().catch(() => {
      throw new Error(
        tr(
          '这张图片无法读取，请换一张 JPG 或 PNG 照片。',
          'This image can’t be read. Try a JPG or PNG photo.',
        ),
      );
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob)
      throw new Error(tr('照片处理失败，请再试一次。', 'Couldn’t process the photo. Please try again.'));
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
