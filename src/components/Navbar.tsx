'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BookOpen, BarChart2, User, Play, Newspaper } from 'lucide-react';

const navigation = [
  { name: 'News Stories', href: '/news-stories', icon: Newspaper },
  { name: 'Scroll Feed', href: '/scroll-feed', icon: Play },
  { name: 'Analyze', href: '/analyze', icon: BarChart2 },
  { name: 'Learn', href: '/learn', icon: BookOpen },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-md" style={{ fontFamily: 'Merriweather, Georgia, \'Times New Roman\', serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Image
                src="/images/Hermesian%20icon%20200x200%20%282%29.png"
                alt="Hermesian icon"
                width={32}
                height={32}
                className="h-8 w-8 mr-2 rounded"
                priority
              />
              <span className="text-2xl font-bold text-primary">Hermesian</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-700 hover:text-primary'
                    } inline-flex items-center px-1 pt-1 text-sm font-medium`}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'text-primary border-l-4 border-primary'
                    : 'text-gray-700 hover:text-primary'
                } block pl-3 pr-4 py-2 text-base font-medium`}
              >
                <div className="flex items-center">
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 