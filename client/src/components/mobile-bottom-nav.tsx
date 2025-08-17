import { Home, Search, Settings, Grid3X3 } from 'lucide-react';
import { useLocation } from 'wouter';

interface MobileBottomNavProps {
  onCategorySelect: (category: string) => void;
  currentCategory: string;
  onToggleView: () => void;
  onToggleSearch: () => void;
}

export function MobileBottomNav({ 
  onCategorySelect, 
  currentCategory, 
  onToggleView,
  onToggleSearch 
}: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      action: () => {
        onCategorySelect('all');
        setLocation('/');
      }
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      action: onToggleSearch
    },
    {
      id: 'view',
      label: 'View',
      icon: Grid3X3,
      action: onToggleView
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      action: () => setLocation('/settings')
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-800 md:hidden z-40">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'home' && currentCategory === 'all';
          
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                isActive
                  ? 'text-purple-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-black/95"></div>
    </div>
  );
}