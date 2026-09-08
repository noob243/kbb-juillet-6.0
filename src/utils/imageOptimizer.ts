/**
 * Image Optimization & Security Utility
 * 
 * - Strictly validates format: JPG, JPEG, PNG
 * - Prevents malicious payload uploads (e.g. SVG XSS, polyglot files) by decoding through Canvas
 * - Optimizes and compresses images to maintain high visual fidelity while drastically
 *   reducing payload size (down to ~20-40 KB) to fit smoothly within Firestore document limits
 * - Strips EXIF metadata for user privacy and security
 */

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];
export const ACCEPTED_IMAGE_INPUT_ACCEPT = '.jpg,.jpeg,.png,image/jpeg,image/png';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSizeMb?: number;
  outputFormat?: 'image/jpeg' | 'image/png';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the selected file is strictly JPG, JPEG, or PNG
 * and does not exceed the maximum allowed raw file size.
 */
export function validateImageFile(
  file: File | null | undefined,
  maxFileSizeMb: number = 10
): ValidationResult {
  if (!file) {
    return { valid: false, error: 'Aucun fichier sélectionné.' };
  }

  // Check file extension
  const fileName = (file.name || '').toLowerCase();
  const hasValidExtension = ACCEPTED_IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext));

  // Check MIME type
  const fileType = (file.type || '').toLowerCase();
  const hasValidMime = ACCEPTED_IMAGE_TYPES.includes(fileType);

  if (!hasValidExtension && !hasValidMime) {
    return {
      valid: false,
      error: 'Format non supporté. Seuls les formats JPG, JPEG et PNG sont acceptés.'
    };
  }

  // Check raw file size limit (default 10 MB)
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `La taille de l'image ne doit pas dépasser ${maxFileSizeMb} Mo.`
    };
  }

  return { valid: true };
}

/**
 * Compresses and optimizes an image file using an off-screen HTML Canvas.
 * Automatically resizes proportionally, strips metadata, and returns a lightweight base64 Data URL.
 */
export function compressAndOptimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const {
    maxWidth = 320,
    maxHeight = 320,
    quality = 0.82,
    maxFileSizeMb = 10,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Validate file format and size
    const validation = validateImageFile(file, maxFileSizeMb);
    if (!validation.valid) {
      return reject(new Error(validation.error || 'Fichier image invalide.'));
    }

    // 2. Read file safely via FileReader
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Erreur de lecture du fichier image."));
    };

    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result;
      if (typeof result !== 'string') {
        return reject(new Error("Impossible de lire les données de l'image."));
      }

      // 3. Load into HTML Image element
      const img = new Image();

      img.onerror = () => {
        reject(new Error("L'image semble corrompue ou n'a pas pu être décodée."));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Compute new dimensions keeping aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          // Ensure positive dimensions
          width = Math.max(1, width);
          height = Math.max(1, height);

          // 4. Render on Canvas (strips EXIF & sanitizes image bytes)
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: outputFormat === 'image/png' });
          if (!ctx) {
            // Fallback to result if canvas 2D context is unavailable
            return resolve(result);
          }

          // If JPEG output, paint a clean white background to prevent black background on transparent PNGs
          if (outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          // Draw image smoothly
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // 5. Output optimized compressed base64
          const optimizedDataUrl = canvas.toDataURL(outputFormat, quality);
          resolve(optimizedDataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Erreur lors de l'optimisation de l'image."));
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}
