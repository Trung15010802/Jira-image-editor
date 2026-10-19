import { prepareShot } from './image'
import { useEditor } from '../store/editorStore'

export async function importFiles(
  files: FileList | File[] | null | undefined,
) {
  if (!files) return
  const state = useEditor.getState()
  const limit = state.shots.length === 0 ? 2 : 1
  const list = Array.from(files)
    .filter((file) => file.type.startsWith('image/'))
    .slice(0, limit)
  if (list.length === 0) return

  const prepared = (
    await Promise.all(list.map((file) => prepareShot(file).catch(() => null)))
  ).filter((shot): shot is NonNullable<typeof shot> => shot !== null)

  if (prepared.length > 0) {
    useEditor.getState().importShots(prepared)
  }
}
