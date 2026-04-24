/** Guardrail for storing images as data URLs in `text` columns (e.g. `profiles.avatar_url`). */
export const MAX_AVATAR_DATA_URL_LENGTH = 900_000;

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read image'));
        return;
      }
      if (result.length > MAX_AVATAR_DATA_URL_LENGTH) {
        reject(
          new Error(
            'Encoded image is too large. Try a smaller file or a lower resolution.',
          ),
        );
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}
