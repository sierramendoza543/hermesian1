'use client';

import { Search, RefreshCw } from 'lucide-react';

interface FilterBarProps {
  onSearch: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onRefresh: () => void;
}

const categories = ['All', 'Politics', 'Technology', 'Science', 'Business', 'World', 'Health', 'Sports', 'Entertainment', 'Climate'];

const FilterBar = ({ onSearch, onCategoryChange, onRefresh }: FilterBarProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search articles..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className="px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition"
          >
            {category}
          </button>
        ))}
      </div>

      <button
        onClick={onRefresh}
        className="px-4 py-2 border-2 border-black text-black rounded-lg hover:bg-primary hover:text-black transition flex items-center gap-2"
      >
        <RefreshCw size={16} />
        Refresh
      </button>
    </div>
  );
};

export default FilterBar; 