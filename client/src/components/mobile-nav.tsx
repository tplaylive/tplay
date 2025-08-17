import { Tv, Film, Search, Bookmark } from "lucide-react";

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--dark-secondary)] border-t border-gray-700 lg:hidden z-40">
      <div className="flex items-center justify-around py-3">
        <button className="flex flex-col items-center space-y-1 text-blue-400">
          <Tv className="h-5 w-5" />
          <span className="text-xs">Live TV</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Film className="h-5 w-5" />
          <span className="text-xs">Movies</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Search className="h-5 w-5" />
          <span className="text-xs">Search</span>
        </button>
        <button className="flex flex-col items-center space-y-1 text-gray-400">
          <Bookmark className="h-5 w-5" />
          <span className="text-xs">Saved</span>
        </button>
      </div>
    </nav>
  );
}
