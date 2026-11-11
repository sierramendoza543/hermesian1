import Image from 'next/image'
import Link from 'next/link'

export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block">
          <Image src="/images/Hermesian%20icon%20200x200%20%282%29.png" alt="Hermesian" width={56} height={56} className="mx-auto h-14 w-14 rounded-2xl" />
        </Link>
        <h1 className="mt-4 font-headline text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>
      </div>
      <div className="card p-6 md:p-8">{children}</div>
      <p className="mt-5 text-center text-sm text-muted">{footer}</p>
    </div>
  )
}
