import React, { useState } from 'react';
import { Player, PlayerStats } from '../types';
import { Award, Search, Trophy, TrendingUp, ShieldAlert, Zap } from 'lucide-react';

interface StatsAnalyticsProps {
  players: Player[];
  playerStats: PlayerStats[];
}

export default function StatsAnalytics({ players, playerStats }: StatsAnalyticsProps) {
  const [search, setSearch] = useState('');

  const filteredStats = playerStats.filter(stat => 
    stat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and filter header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-sleek-panel border border-sleek-border p-4 rounded-2xl shadow-md">
        <h3 className="font-extrabold text-sleek-accent text-sm uppercase tracking-wider">Player Performance Profiles</h3>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search player stats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-sleek-overlay border border-sleek-border text-sleek-text placeholder-white/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-sleek-accent text-xs font-mono"
          />
          <Search className="absolute left-3 top-2.5 text-sleek-text-muted" size={14} />
        </div>
      </div>

      {filteredStats.length === 0 ? (
        <div className="bg-sleek-card border border-sleek-border p-8 rounded-2xl text-center text-xs text-sleek-text-muted">
          No matching player profiles found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStats.map((stat) => (
            <div key={stat.id} className="bg-sleek-card border border-sleek-border rounded-2xl p-5 shadow-sleek-xl space-y-4">
              {/* Profile header */}
              <div className="flex items-center gap-3 border-b border-sleek-border pb-3">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(stat.name)}`}
                  alt={stat.name}
                  className="w-10 h-10 rounded-xl bg-sleek-overlay border border-sleek-border p-1 flex-shrink-0"
                />
                <div>
                  <h4 className="font-extrabold text-sleek-text text-sm">{stat.name}</h4>
                  <p className="text-xs text-sleek-accent font-black uppercase tracking-widest font-mono mt-0.5">
                    {stat.matchesPlayed} Matches &bull; {stat.awards.mvpPoints || 0} MVP Points
                  </p>
                </div>
              </div>

              {/* Career Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* Batting metrics box */}
                <div className="bg-sleek-panel p-2.5 rounded-xl border border-sleek-border space-y-1.5">
                  <span className="text-xs font-black text-sleek-accent flex items-center gap-0.5 uppercase tracking-widest">
                    <Zap size={10} /> Batting
                  </span>
                  <div className="text-xs text-sleek-text-muted space-y-0.5 font-mono">
                    <p>Inns: <strong className="text-sleek-text font-bold">{stat.batting?.innings || 0}</strong></p>
                    <p>Runs: <strong className="text-sleek-text font-bold">{stat.batting?.runs || 0}</strong></p>
                    <p>HS: <strong className="text-sleek-text font-bold">{stat.batting?.highestScore || 0}</strong></p>
                    <p>SR: <strong className="text-sleek-accent font-bold">{stat.batting?.strikeRate || 0}</strong></p>
                    <p>Avg: <strong className="text-sleek-text font-bold">{stat.batting?.average || 0}</strong></p>
                  </div>
                </div>

                {/* Bowling metrics box */}
                <div className="bg-sleek-panel p-2.5 rounded-xl border border-sleek-border space-y-1.5">
                  <span className="text-xs font-black text-sleek-text flex items-center gap-0.5 uppercase tracking-widest">
                    <TrendingUp size={10} /> Bowling
                  </span>
                  <div className="text-xs text-sleek-text-muted space-y-0.5 font-mono">
                    <p>Inns: <strong className="text-sleek-text font-bold">{stat.bowling?.innings || 0}</strong></p>
                    <p>Wkts: <strong className="text-sleek-text font-bold">{stat.bowling?.wickets || 0}</strong></p>
                    <p>Econ: <strong className="text-sleek-text font-bold">{stat.bowling?.economy || 0}</strong></p>
                    <p>Best: <strong className="text-sleek-accent font-bold">{stat.bowling?.bestWickets || 0}/{stat.bowling?.bestRuns || 0}</strong></p>
                  </div>
                </div>

                {/* Fielding & Awards box */}
                <div className="bg-sleek-panel p-2.5 rounded-xl border border-sleek-border space-y-1.5">
                  <span className="text-xs font-black text-sleek-text-muted flex items-center gap-0.5 uppercase tracking-widest">
                    <Award size={10} /> Fields
                  </span>
                  <div className="text-xs text-sleek-text-muted space-y-0.5 font-mono">
                    <p>Ctch: <strong className="text-sleek-text font-bold">{stat.fielding?.catches || 0}</strong></p>
                    <p>R-Out: <strong className="text-sleek-text font-bold">{stat.fielding?.runOuts || 0}</strong></p>
                    <p>Stmp: <strong className="text-sleek-text font-bold">{stat.fielding?.stumpings || 0}</strong></p>
                    <p>POTM: <strong className="text-sleek-accent font-bold">{stat.awards?.potm || 0}</strong></p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
