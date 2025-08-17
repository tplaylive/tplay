import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Circle, Home, RotateCcw, Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react';

interface TVNavigationOverlayProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export function TVNavigationOverlay({ isVisible = false, onToggle }: TVNavigationOverlayProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Auto-hide instructions after 10 seconds
    if (showInstructions) {
      const timer = setTimeout(() => setShowInstructions(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showInstructions]);

  useEffect(() => {
    // Show instructions on first load
    const hasSeenInstructions = localStorage.getItem('tv-remote-instructions');
    if (!hasSeenInstructions) {
      setShowInstructions(true);
      localStorage.setItem('tv-remote-instructions', 'true');
    }
  }, []);

  if (!isVisible && !showInstructions) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-gray-900/95 border border-gray-700 rounded-2xl p-8 max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">TV Remote Control</h2>
          <p className="text-gray-400">Navigate T PLAY with your TV remote or keyboard</p>
        </div>

        {/* Remote Controls Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {/* Navigation */}
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-4 mb-3">
              <div className="grid grid-cols-3 gap-2 w-24 mx-auto">
                <div className="col-start-2">
                  <ArrowUp className="w-6 h-6 text-blue-400 mx-auto" />
                </div>
                <ArrowLeft className="w-6 h-6 text-blue-400" />
                <Circle className="w-6 h-6 text-green-400" />
                <ArrowRight className="w-6 h-6 text-blue-400" />
                <div className="col-start-2">
                  <ArrowDown className="w-6 h-6 text-blue-400 mx-auto" />
                </div>
              </div>
            </div>
            <h3 className="text-white font-semibold">Navigation</h3>
            <p className="text-gray-400 text-sm">Arrow keys + Enter</p>
          </div>

          {/* Media Controls */}
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-4 mb-3">
              <div className="flex justify-center space-x-2">
                <Play className="w-6 h-6 text-green-400" />
                <Pause className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <h3 className="text-white font-semibold">Media</h3>
            <p className="text-gray-400 text-sm">Play/Pause/Stop</p>
          </div>

          {/* Quick Actions */}
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-4 mb-3">
              <div className="flex justify-center space-x-2">
                <Home className="w-6 h-6 text-purple-400" />
                <RotateCcw className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <h3 className="text-white font-semibold">Quick</h3>
            <p className="text-gray-400 text-sm">Home/Back</p>
          </div>

          {/* Volume */}
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-4 mb-3">
              <div className="flex justify-center space-x-2">
                <Volume2 className="w-6 h-6 text-blue-400" />
                <VolumeX className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <h3 className="text-white font-semibold">Volume</h3>
            <p className="text-gray-400 text-sm">+/- or Vol keys</p>
          </div>

          {/* Number Keys */}
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-4 mb-3">
              <div className="grid grid-cols-3 gap-1 text-white text-sm">
                <div className="bg-gray-700 rounded p-1">1</div>
                <div className="bg-gray-700 rounded p-1">2</div>
                <div className="bg-gray-700 rounded p-1">3</div>
                <div className="bg-gray-700 rounded p-1">4</div>
                <div className="bg-gray-700 rounded p-1">5</div>
                <div className="bg-gray-700 rounded p-1">6</div>
              </div>
            </div>
            <h3 className="text-white font-semibold">Channels</h3>
            <p className="text-gray-400 text-sm">Number keys 0-9</p>
          </div>

          {/* Special Functions */}
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-4 mb-3">
              <div className="text-white text-sm space-y-1">
                <div>ESC</div>
                <div>Backspace</div>
                <div>Space</div>
              </div>
            </div>
            <h3 className="text-white font-semibold">Special</h3>
            <p className="text-gray-400 text-sm">Back/Select</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <h4 className="text-blue-300 font-semibold mb-2">How to Use:</h4>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• Use arrow keys to navigate between channels and categories</li>
            <li>• Press Enter or Space to select channels</li>
            <li>• Press number keys (0-9) for quick channel selection</li>
            <li>• Use Home key to return to main page</li>
            <li>• ESC or Backspace to go back</li>
            <li>• Media keys control video playback</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setShowInstructions(false)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold"
          >
            Got it!
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
              Close
            </button>
          )}
        </div>

        {/* Footer note */}
        <p className="text-gray-500 text-xs text-center mt-4">
          Perfect for smart TVs, media boxes, and TV remote controls
        </p>
      </div>
    </div>
  );
}

// TV Remote Help Button Component
export function TVRemoteHelpButton() {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowOverlay(true)}
        className="fixed bottom-4 left-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg z-50 hidden lg:block"
        title="TV Remote Help"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      <TVNavigationOverlay 
        isVisible={showOverlay} 
        onToggle={() => setShowOverlay(false)} 
      />
    </>
  );
}