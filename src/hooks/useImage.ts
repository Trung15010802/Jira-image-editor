import { useEffect, useState } from 'react'
import { loadImage } from '../lib/image'

export function useImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    let active = true
    loadImage(src)
      .then((loaded) => {
        if (active) setImage(loaded)
      })
      .catch(() => {
        if (active) setImage(null)
      })
    return () => {
      active = false
    }
  }, [src])

  return image
}
