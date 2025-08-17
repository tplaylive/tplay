import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Program } from "@shared/schema";

interface EPGTimelineProps {
  channelId: number;
}

export default function EPGTimeline({ channelId }: EPGTimelineProps) {
  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["/api/channels", channelId, "programs"],
    enabled: channelId !== 0,
  });

  // Mock additional programs for demonstration
  const mockPrograms = [
    {
      id: 1,
      title: "Live Cricket Match",
      description: "India vs Australia - 3rd Test Day 2",
      startTime: "14:30",
      endTime: "18:00",
      channel: "Star Sports 1 HD",
      isLive: true
    },
    {
      id: 2,
      title: "Evening News",
      description: "National and International Headlines",
      startTime: "18:00",
      endTime: "19:00",
      channel: "News24",
      isLive: false
    },
    {
      id: 3,
      title: "Bollywood Blockbuster",
      description: "3 Idiots (2009) - Comedy Drama",
      startTime: "19:30",
      endTime: "22:30",
      channel: "Zee Cinema HD",
      isLive: false
    }
  ];

  return (
    <div className="bg-[var(--dark-secondary)] border-b border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Program Guide</h3>
        <div className="flex items-center space-x-2 text-sm">
          <Button variant="ghost" size="sm" className="px-3 py-1 bg-[var(--dark-tertiary)] hover:bg-gray-600">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">Today</span>
          <Button variant="ghost" size="sm" className="px-3 py-1 bg-[var(--dark-tertiary)] hover:bg-gray-600">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2 custom-scrollbar">
        {mockPrograms.map((program) => (
          <div 
            key={program.id}
            className={`flex-shrink-0 bg-[var(--dark-tertiary)] rounded-lg p-3 min-w-64 ${
              program.isLive ? 'border-l-4' : ''
            }`}
            style={program.isLive ? {
              borderLeftColor: '#3B82F6'
            } : {}}
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-sm">{program.title}</h4>
              <span className={`text-xs px-2 py-1 rounded ${
                program.isLive 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-600 text-white'
              }`}>
                {program.isLive ? 'LIVE' : program.startTime}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-1">{program.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{program.startTime} - {program.endTime}</span>
              <span>{program.channel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
