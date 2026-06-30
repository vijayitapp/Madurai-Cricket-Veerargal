import React from 'react';
import { Match, Player } from '../types';
import LiveDashboard from './LiveDashboard';
import { X } from 'lucide-react';

interface FullScorecardModalProps {
  match: Match;
  players: Player[];
  onClose: () => void;
}

export function FullScorecardModal({ match, players, onClose }: FullScorecardModalProps) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="min-h-screen flex flex-col max-w-4xl mx-auto relative pt-12 md:pt-4">
        <div className="fixed md:sticky top-4 right-4 z-[80] flex justify-end px-4 w-full max-w-4xl mx-auto">
          <button
            onClick={onClose}
            className="p-3 bg-sleek-overlay hover:bg-sleek-accent hover:text-black border border-sleek-border text-sleek-text rounded-full transition cursor-pointer shadow-sleek-2xl backdrop-blur-sm flex items-center justify-center"
            title="Close Full Scorecard"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 pt-0 flex-1">
          <LiveDashboard match={match} players={players} />
        </div>
      </div>
    </div>
  );
}
