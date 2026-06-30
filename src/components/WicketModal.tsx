import React from 'react';

interface WicketModalProps {
  strikerId: string;
  nonStrikerId: string;
  wicketBatterId: string;
  setWicketBatterId: (id: string) => void;
  wicketType: 'bowled' | 'caught' | 'runout' | 'stumped' | 'lbw' | 'hit_wicket';
  setWicketType: (type: any) => void;
  fielderName: string;
  setFielderName: (name: string) => void;
  getPlayerName: (id: string) => string;
  fieldingTeamPlayers: string[];
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function WicketModal({
  strikerId, nonStrikerId, wicketBatterId, setWicketBatterId,
  wicketType, setWicketType, fielderName, setFielderName,
  getPlayerName, fieldingTeamPlayers, onCancel, onSubmit
}: WicketModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-sleek-2xl">
        <h4 className="font-extrabold text-sleek-accent text-base uppercase tracking-wider">Register Wicket Out</h4>
        
        <div className="space-y-1">
          <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest">Dismissal Type</label>
          <select
            value={wicketType}
            onChange={(e) => {
              const newType = e.target.value as any;
              setWicketType(newType);
              if (newType !== 'runout') {
                setWicketBatterId(strikerId);
              }
              // Clear fielder selection if not needed
              if (newType !== 'caught' && newType !== 'runout' && newType !== 'stumped') {
                setFielderName('');
              }
            }}
            required
            className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-sm text-sleek-text focus:ring-1 focus:ring-sleek-accent"
          >
            <option value="bowled">Bowled</option>
            <option value="caught">Caught</option>
            <option value="runout">Run Out</option>
            <option value="stumped">Stumped</option>
            <option value="lbw">LBW</option>
            <option value="hit_wicket">Hit Wicket</option>
          </select>
        </div>

        {wicketType === 'runout' && (
          <div className="space-y-1">
            <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest">Who got out?</label>
            <select
              value={wicketBatterId}
              onChange={(e) => setWicketBatterId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-sm text-sleek-text focus:ring-1 focus:ring-sleek-accent"
            >
              <option value={strikerId}>Striker: {getPlayerName(strikerId)}</option>
              <option value={nonStrikerId}>Non-Striker: {getPlayerName(nonStrikerId)}</option>
            </select>
          </div>
        )}

        {(wicketType === 'caught' || wicketType === 'runout' || wicketType === 'stumped') && (
          <div className="space-y-1">
            <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest">Fielder Name</label>
            <select
              value={fieldingTeamPlayers.find(id => getPlayerName(id) === fielderName) || ''}
              onChange={(e) => {
                const id = e.target.value;
                setFielderName(id ? getPlayerName(id) : '');
              }}
              required
              className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-sm text-sleek-text focus:ring-1 focus:ring-sleek-accent"
            >
              <option value="">Select Fielder...</option>
              {fieldingTeamPlayers.map(id => (
                <option key={id} value={id}>{getPlayerName(id)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 bg-sleek-overlay border border-sleek-border text-sleek-text-muted text-xs font-black uppercase tracking-wider rounded-xl hover:bg-sleek-overlay-hover transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-red-500/30 transition"
          >
            Out!
          </button>
        </div>
      </form>
    </div>
  );
}
