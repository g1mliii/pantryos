export const MAX_RECIPE_PHOTO_BYTES = 400_000;
const MAX_SOURCE_BYTES = 10_000_000;

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () =>
      reject(new Error("That image format is not supported."));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

export async function compressRecipePhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Choose an image smaller than 10 MB.");
  }
  const source = await loadImage(await readFile(file));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare the image.");

  for (const [maxDimension, quality] of [
    [1200, 0.78],
    [960, 0.68],
    [720, 0.58],
  ] as const) {
    const scale = Math.min(
      1,
      maxDimension / Math.max(source.width, source.height),
    );
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/webp", quality);
    if (dataUrl.length <= MAX_RECIPE_PHOTO_BYTES) return dataUrl;
  }
  throw new Error("That image is still too large after compression.");
}
