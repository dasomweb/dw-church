/**
 * Client-side image resizer using Canvas API.
 * Resizes images before upload to reduce traffic and storage.
 *
 * - Max dimension: 1920px (maintains aspect ratio)
 * - Output: JPEG at 80% quality
 * - Non-image files pass through unchanged
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/bmp']);

/**
 * Resize a single image file. Returns a new File with reduced size.
 * Non-image files are returned as-is.
 */
export async function resizeImage(file: File): Promise<File> {
  if (!IMAGE_TYPES.has(file.type)) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback: return original
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Create new File with .jpg extension
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => resolve(file); // Fallback: return original
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize multiple images. Processes in parallel.
 */
export async function resizeImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(resizeImage));
}
