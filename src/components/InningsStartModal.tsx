import React, { useState } from 'react';
import { Player, Match } from '../types';
import { Shield, Play } from 'lucide-react';

interface InningsStartModalProps {
  battingTeam: { name: string; players: string[] };
  bowlingTeam: { name: string; players: string[] };
  getPlayerName: (id: string) => string;
  onConfirm: (strikerId: string, nonStrikerId: string, bowlerId: string) => void;
  innings: 1 | 2;
  match: Match;
}

export function InningsStartModal({ battingTeam, bowlingTeam, getPlayerName, onConfirm, innings, match }: InningsStartModalProps) {
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  const isValid = strikerId && nonStrikerId && bowlerId && strikerId !== nonStrikerId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onConfirm(strikerId, nonStrikerId, bowlerId);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-sleek-card border border-sleek-border rounded-3xl p-6 w-full max-w-md shadow-sleek-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-sleek-accent/10 rounded-full flex items-center justify-center mx-auto text-sleek-accent shadow-inner mb-2">
            <Shield size={24} />
          </div>
          <h3 className="font-extrabold text-sleek-text text-lg uppercase tracking-widest">Start Innings {innings}</h3>
          <p className="text-xs text-sleek-text-muted">Select the opening batters for {battingTeam.name} and the opening bowler for {bowlingTeam.name}.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-sleek-accent uppercase tracking-widest block">Striker (Batter 1)</label>
            <select
              value={strikerId}
              onChange={(e) => setStrikerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none focus:border-sleek-accent text-sm text-sleek-text font-bold"
              required
            >
              <option value="">Select Striker...</option>
              {battingTeam.players.map(id => (
                <option key={id} value={id} disabled={id === nonStrikerId}>{getPlayerName(id)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-sleek-accent uppercase tracking-widest block">Non-Striker (Batter 2)</label>
            <select
              value={nonStrikerId}
              onChange={(e) => setNonStrikerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none focus:border-sleek-accent text-sm text-sleek-text font-bold"
              required
            >
              <option value="">Select Non-Striker...</option>
              {battingTeam.players.map(id => (
                <option key={id} value={id} disabled={id === strikerId}>{getPlayerName(id)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-sleek-border/50">
            <label className="text-xs font-black text-emerald-400 uppercase tracking-widest block">Opening Bowler</label>
            <select
              value={bowlerId}
              onChange={(e) => setBowlerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none focus:border-emerald-400 text-sm text-sleek-text font-bold"
              required
            >
              <option value="">Select Bowler...</option>
              {bowlingTeam.players.map(id => {
                const maxOvers = match.overs <= 8 ? 2 : null;
                const oversText = maxOvers ? ` [0.0/${maxOvers} overs]` : '';
                return (
                  <option key={id} value={id}>
                    {getPlayerName(id)}{oversText}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="w-full py-3 bg-sleek-accent text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-sleek-accent/80 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={14} fill="currentColor" /> Play Ball
        </button>
      </form>
    </div>
  );
}
