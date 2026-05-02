import DigestContainer from '@/components/NewsDigest/DigestContainer'

export const metadata = {
  title: 'Home | Hermesian',
  description: 'Daily news digest with curated headlines and stories',
}

export default function Home() {
  return (
    <main className="min-h-screen bg-accent">
      <div className="max-w-7xl mx-auto">
        <div className="py-16 px-4 md:px-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Today’s News
          </h1>
          <p className="text-xl mb-2">
            Explore curated headlines and stories across topics
          </p>
        </div>

        <DigestContainer />
      </div>
    </main>
  )
}
