const imageCache = new Map<string, HTMLImageElement>()
const pendingImages = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return Promise.resolve(cached)

  const pending = pendingImages.get(src)
  if (pending) return pending

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      imageCache.set(src, image)
      pendingImages.delete(src)
      resolve(image)
    }
    image.onerror = () => {
      pendingImages.delete(src)
      reject(new Error('Could not load image'))
    }
    image.src = src
  })

  pendingImages.set(src, promise)
  return promise
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export interface PreparedShot {
  name: string
  src: string
  width: number
  height: number
}

export async function prepareShot(file: File): Promise<PreparedShot | null> {
  if (!file.type.startsWith('image/')) return null
  const src = await readFileAsDataURL(file)
  const image = await loadImage(src)
  return {
    name: file.name.replace(/\.[^.]+$/, '') || 'Screenshot',
    src,
    width: image.naturalWidth || 1,
    height: image.naturalHeight || 1,
  }
}
