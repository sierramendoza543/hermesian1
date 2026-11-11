'use client'

import Link from 'next/link'
import { Layers } from 'lucide-react'
import type { Story } from '@/lib/stories'
import { leanLabel } from '@/lib/outlets'
import { rememberStory, timeAgo } from '@/lib/format'
import MiniSpectrum from './MiniSpectrum'
import OutletIcon from './OutletIcon'
import StoryImage from './StoryImage'
import { prefetchBrief } from '@/lib/prefetch'

export default function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  const shown = story.articles.slice(0, featured ? 7 : 5)
  const more = story.sourceCount - shown.length

  return (
    <article
      className="card group relative overflow-hidden transition hover:shadow-lift"
      onPointerEnter={() => prefetchBrief(story)}
      onTouchStart={() => prefetchBrief(story)}
    >
      <Link href={`/story/${story.id}`} onClick={() => rememberStory(story)} className="absolute inset-0 z-10" aria-label={story.headline} />

      <div className={featured ? '' : 'xl:flex xl:flex-row-reverse'}>
        <StoryImage
          id={story.id}
          articles={story.articles}
          label={story.category}
          className={featured ? 'aspect-[16/8] w-full' : 'aspect-[16/9] w-full xl:aspect-auto xl:w-48 xl:shrink-0'}
        />

        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
          <div className="flex items-center gap-2 text-xs">
            <span className="label-mono rounded-md bg-accent px-2 py-1 !text-primary">{story.category}</span>
            <span className="text-muted">{timeAgo(story.publishedAt)}</span>
          </div>

          <h3 className={`font-headline font-bold leading-snug text-ink group-hover:text-primary ${featured ? 'mt-3 text-2xl md:text-3xl' : 'mt-2.5 text-[17px]'}`}>
            {story.headline}
          </h3>

          <div className="mt-auto pt-4">
            <MiniSpectrum articles={story.articles} />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="relative z-20 flex -space-x-1.5">
                {shown.map((a) => (
                  <OutletIcon key={a.source} name={a.outlet || a.source} domain={a.domain} lean={a.lean} size={featured ? 28 : 24} />
                ))}
                {more > 0 && <span className="ml-2.5 flex h-6 items-center text-xs font-medium text-muted">+{more}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Layers className="h-3.5 w-3.5" />
                {story.sourceCount} sources
                {story.avgLean !== null && <span className="hidden sm:inline">· {leanLabel(story.avgLean)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
