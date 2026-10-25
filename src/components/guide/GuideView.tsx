import { useGuideShortcuts } from '../../hooks/useGuideShortcuts'
import { GuideCanvas } from './GuideCanvas'
import { GuideSidebar } from './GuideSidebar'
import { GuideToolbar } from './GuideToolbar'

export function GuideView() {
  useGuideShortcuts()

  return (
    <>
      <GuideToolbar />
      <main className="flex min-h-0 flex-1">
        <GuideSidebar />
        <GuideCanvas />
      </main>
    </>
  )
}
