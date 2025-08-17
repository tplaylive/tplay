import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface TVRemoteHandlerProps {
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onSelect?: () => void;
  onBack?: () => void;
  onHome?: () => void;
}

export function TVRemoteHandler({ onNavigate, onSelect, onBack, onHome }: TVRemoteHandlerProps) {
  const [, setLocation] = useLocation();
  const currentFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for TV remote keys
      const tvKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Enter', 'Escape', 'Backspace', 'Home',
        'MediaPlayPause', 'MediaPlay', 'MediaPause',
        'MediaStop', 'MediaNextTrack', 'MediaPreviousTrack'
      ];
      
      if (tvKeys.includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }

      switch (event.key) {
        case 'ArrowUp':
          handleNavigation('up');
          break;
        case 'ArrowDown':
          handleNavigation('down');
          break;
        case 'ArrowLeft':
          handleNavigation('left');
          break;
        case 'ArrowRight':
          handleNavigation('right');
          break;
        case 'Enter':
        case ' ': // Spacebar for select
          handleSelect();
          break;
        case 'Escape':
        case 'Backspace':
          handleBack();
          break;
        case 'Home':
          handleHome();
          break;
        case 'MediaPlayPause':
        case 'MediaPlay':
        case 'MediaPause':
          handlePlayPause();
          break;
        case 'MediaStop':
          handleStop();
          break;
        case 'MediaNextTrack':
          handleNext();
          break;
        case 'MediaPreviousTrack':
          handlePrevious();
          break;
        // Number keys for quick channel selection
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          handleNumberKey(event.key);
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Auto-focus first focusable element on mount
    focusFirstElement();

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onNavigate, onSelect, onBack, onHome]);

  const focusFirstElement = () => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      currentFocusRef.current = focusableElements[0];
    }
  };

  const getFocusableElements = (): HTMLElement[] => {
    const selectors = [
      'button:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '.tv-focusable',
      '.channel-card',
      '.category-filter',
      '.video-player',
      'input:not([disabled])',
      'select:not([disabled])'
    ];
    
    const elements = document.querySelectorAll(selectors.join(', ')) as NodeListOf<HTMLElement>;
    return Array.from(elements).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && 
             window.getComputedStyle(el).visibility !== 'hidden';
    });
  };

  const handleNavigation = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (onNavigate) {
      onNavigate(direction);
      return;
    }

    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    
    if (currentIndex === -1) {
      focusFirstElement();
      return;
    }

    let nextIndex = currentIndex;
    const currentRect = focusableElements[currentIndex].getBoundingClientRect();

    switch (direction) {
      case 'up':
        // Find element above current element
        nextIndex = findElementInDirection(focusableElements, currentIndex, 'up');
        break;
      case 'down':
        // Find element below current element
        nextIndex = findElementInDirection(focusableElements, currentIndex, 'down');
        break;
      case 'left':
        // Find element to the left
        nextIndex = findElementInDirection(focusableElements, currentIndex, 'left');
        break;
      case 'right':
        // Find element to the right
        nextIndex = findElementInDirection(focusableElements, currentIndex, 'right');
        break;
    }

    if (nextIndex !== currentIndex && focusableElements[nextIndex]) {
      focusableElements[nextIndex].focus();
      currentFocusRef.current = focusableElements[nextIndex];
      
      // Scroll into view if needed
      focusableElements[nextIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  };

  const findElementInDirection = (elements: HTMLElement[], currentIndex: number, direction: string): number => {
    const current = elements[currentIndex];
    const currentRect = current.getBoundingClientRect();
    let bestMatch = currentIndex;
    let bestDistance = Infinity;

    elements.forEach((element, index) => {
      if (index === currentIndex) return;
      
      const rect = element.getBoundingClientRect();
      let isInDirection = false;
      let distance = 0;

      switch (direction) {
        case 'up':
          isInDirection = rect.bottom <= currentRect.top + 10;
          distance = currentRect.top - rect.bottom + Math.abs(rect.left - currentRect.left) * 0.3;
          break;
        case 'down':
          isInDirection = rect.top >= currentRect.bottom - 10;
          distance = rect.top - currentRect.bottom + Math.abs(rect.left - currentRect.left) * 0.3;
          break;
        case 'left':
          isInDirection = rect.right <= currentRect.left + 10;
          distance = currentRect.left - rect.right + Math.abs(rect.top - currentRect.top) * 0.3;
          break;
        case 'right':
          isInDirection = rect.left >= currentRect.right - 10;
          distance = rect.left - currentRect.right + Math.abs(rect.top - currentRect.top) * 0.3;
          break;
      }

      if (isInDirection && distance < bestDistance) {
        bestDistance = distance;
        bestMatch = index;
      }
    });

    return bestMatch;
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect();
      return;
    }

    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      // Trigger click event
      activeElement.click();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    // Go back in browser history or to home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
      return;
    }

    setLocation('/');
  };

  const handlePlayPause = () => {
    // Find video element and toggle play/pause
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  };

  const handleStop = () => {
    // Stop video playback
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  const handleNext = () => {
    // Navigate to next channel
    const nextButton = document.querySelector('[data-tv-next]') as HTMLElement;
    if (nextButton) {
      nextButton.click();
    }
  };

  const handlePrevious = () => {
    // Navigate to previous channel
    const prevButton = document.querySelector('[data-tv-prev]') as HTMLElement;
    if (prevButton) {
      prevButton.click();
    }
  };

  const handleNumberKey = (key: string) => {
    // Quick channel selection by number
    const channelElements = document.querySelectorAll('[data-channel-number]') as NodeListOf<HTMLElement>;
    const channelNumber = parseInt(key);
    
    if (channelElements[channelNumber]) {
      channelElements[channelNumber].click();
    }
  };

  return null; // This component doesn't render anything
}

// TV Remote Visual Indicator Component
export function TVRemoteIndicator() {
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-1 z-50 hidden lg:block">
      <div className="font-semibold mb-2">TV Remote Controls:</div>
      <div>↑↓←→ Navigate</div>
      <div>Enter/Space Select</div>
      <div>Esc/Back Back</div>
      <div>Home Home</div>
      <div>Play/Pause Media</div>
      <div>0-9 Quick Channel</div>
    </div>
  );
}