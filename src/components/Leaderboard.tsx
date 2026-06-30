import React, { useState } from 'react';
import { PlayerStats } from '../types';
import { Trophy, Award, Zap, TrendingUp, Sparkles, Star } from 'lucide-react';

interface LeaderboardProps {
  playerStats: PlayerStats[];
}

export default function Leaderboard({ playerStats }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'mvp'>('batting');

  // Sort helper functions
  const getTopBatting = () => {
    return [...playerStats]
      .filter(s => s.batting.innings > 0)
      .sort((a, b) => b.batting.runs - a.batting.runs)
      .slice(0, 10);
  };

  const getTopBowling = () => {
    return [...playerStats]
      .filter(s => s.bowling.innings > 0)
      .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
      .slice(0, 10);
  };

  const getTopMvp = () => {
    return [...playerStats]
      .sort((a, b) => (b.awards.mvpPoints || 0) - (a.awards.mvpPoints || 0))
      .slice(0, 10);
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="bg-sleek-panel border border-sleek-border p-1.5 rounded-2xl flex gap-1 shadow-md">
        <button
          onClick={() => setActiveTab('batting')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'batting'
              ? 'bg-sleek-accent text-black shadow-lg shadow-sleek-accent/10'
              : 'text-sleek-text-muted hover:bg-sleek-overlay hover:text-sleek-text'
          }`}
        >
          <Zap size={14} /> Batting Kings
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'bowling'
              ? 'bg-sleek-accent text-black shadow-lg shadow-sleek-accent/10'
              : 'text-sleek-text-muted hover:bg-sleek-overlay hover:text-sleek-text'
          }`}
        >
          <TrendingUp size={14} /> Bowling Stars
        </button>
        <button
          onClick={() => setActiveTab('mvp')}
          className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'mvp'
              ? 'bg-sleek-accent text-black shadow-lg shadow-sleek-accent/10'
              : 'text-sleek-text-muted hover:bg-sleek-overlay hover:text-sleek-text'
          }`}
        >
          <Trophy size={14} /> MVP & Awards
        </button>
      </div>

      {playerStats.length === 0 ? (
        <div className="bg-sleek-card border border-sleek-border p-12 rounded-3xl text-center text-xs text-sleek-text-muted">
          No stats available. Seed players or record matches to see rankings!
        </div>
      ) : (
        <div className="bg-sleek-card border border-sleek-border rounded-2xl overflow-hidden shadow-sleek-xl">
          {/* Header */}
          <div className="p-4 border-b border-sleek-border bg-sleek-panel flex justify-between items-center">
            <h4 className="font-extrabold text-sleek-accent text-sm flex items-center gap-1.5">
              <Sparkles size={16} className="text-sleek-accent" />
              Top Performers
            </h4>
            <span className="text-xs text-sleek-text-muted font-black uppercase tracking-wider">
              {activeTab === 'batting' ? 'Sorted by Runs' : activeTab === 'bowling' ? 'Sorted by Wickets' : 'Sorted by MVP Points'}
            </span>
          </div>

          {/* List */}
          <div className="divide-y divide-white/5">
            {activeTab === 'batting' && getTopBatting().map((stat, idx) => (
              <div key={stat.id} className="p-4 flex items-center justify-between hover:bg-sleek-overlay transition">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-sleek-text-muted w-6 text-center font-mono">
                    {getMedal(idx)}
                  </span>
                  <div>
                    <p className="font-extrabold text-sleek-text text-xs">{stat.name}</p>
                    <p className="text-xs text-sleek-text-muted font-mono">Innings: {stat.batting.innings} &bull; SR: {stat.batting.strikeRate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sleek-accent text-sm">{stat.batting.runs}</p>
                  <p className="text-[9px] text-sleek-text-muted font-mono">Avg: {stat.batting.average}</p>
                </div>
              </div>
            ))}

            {activeTab === 'bowling' && getTopBowling().map((stat, idx) => (
              <div key={stat.id} className="p-4 flex items-center justify-between hover:bg-sleek-overlay transition">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-sleek-text-muted w-6 text-center font-mono">
                    {getMedal(idx)}
                  </span>
                  <div>
                    <p className="font-extrabold text-sleek-text text-xs">{stat.name}</p>
                    <p className="text-xs text-sleek-text-muted font-mono">Innings: {stat.bowling.innings} &bull; Econ: {stat.bowling.economy}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sleek-accent text-sm">{stat.bowling.wickets}</p>
                  <p className="text-[9px] text-sleek-text-muted font-mono">Best: {stat.bowling.bestWickets}/{stat.bowling.bestRuns}</p>
                </div>
              </div>
            ))}

            {activeTab === 'mvp' && getTopMvp().map((stat, idx) => (
              <div key={stat.id} className="p-4 flex items-center justify-between hover:bg-sleek-overlay transition">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-sleek-text-muted w-6 text-center font-mono">
                    {getMedal(idx)}
                  </span>
                  <div>
                    <p className="font-extrabold text-sleek-text text-xs">{stat.name}</p>
                    <p className="text-xs text-sleek-text-muted font-mono">POTM: {stat.awards.potm} &bull; Best Bat: {stat.awards.bestBatter}</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <p className="font-black text-sleek-accent text-sm flex items-center gap-0.5 justify-end">
                    <Star size={12} className="fill-[#A3FF12]" /> {stat.awards.mvpPoints || 0}
                  </p>
                  <p className="text-[9px] text-sleek-text-muted">MVP Points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
