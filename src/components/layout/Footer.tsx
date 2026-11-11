import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-sand bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          <span className="font-headline font-bold text-charcoal">Hermesian</span> is a project about reading the news critically. Stories come from public news feeds and
          the analysis is written by AI, so check the original articles too.
        </p>
        <div className="flex gap-5">
          <Link href="/learn" className="hover:text-primary">Media literacy 101</Link>
          <Link href="/analyze" className="hover:text-primary">Analyze an article</Link>
          <Link href="/games" className="hover:text-primary">Games</Link>
        </div>
      </div>
    </footer>
  )
}
