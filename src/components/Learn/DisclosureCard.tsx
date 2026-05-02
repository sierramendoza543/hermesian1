'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DisclosureCardProps {
  title: string;
  children: React.ReactNode;
  id?: string;
}

export default function DisclosureCard({ title, children, id }: DisclosureCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-md mb-6 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-accent transition"
        aria-expanded={isOpen}
      >
        <span className="text-xl font-medium text-gray-900">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`px-6 py-4 prose prose-primary transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        {children}
      </div>
    </div>
  );
} 