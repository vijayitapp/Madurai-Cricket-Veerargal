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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0F1218] border border-white/5 p-4 rounded-2xl shadow-md">
        <h3 className="font-extrabold text-[#A3FF12] text-sm uppercase tracking-wider">Player Performance Profiles</h3>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search player stats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#A3FF12] text-xs font-mono"
          />
          <Search className="absolute left-3 top-2.5 text-white/40" size={14} />
        </div>
      </div>

      {filteredStats.length === 0 ? (
        <div className="bg-[#14181F] border border-white/5 p-8 rounded-2xl text-center text-xs text-white/40">
          No matching player profiles found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStats.map((stat) => (
            <div key={stat.id} className="bg-[#14181F] border border-white/5 rounded-2xl p-5 shadow-xl space-y-4">
              {/* Profile header */}
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(stat.name)}`}
                  alt={stat.name}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-1 flex-shrink-0"
                />
                <div>
                  <h4 className="font-extrabold text-white text-sm">{stat.name}</h4>
                  <p className="text-[10px] text-[#A3FF12] font-black uppercase tracking-widest font-mono mt-0.5">
                    {stat.matchesPlayed} Matches &bull; {stat.awards.mvpPoints || 0} MVP Points
                  </p>
                </div>
              </div>

              {/* Career Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* Batting metrics box */}
                <div className="bg-[#0F1218] p-2.5 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-black text-[#A3FF12] flex items-center gap-0.5 uppercase tracking-widest">
                    <Zap size={10} /> Batting
                  </span>
                  <div className="text-[11px] text-white/60 space-y-0.5 font-mono">
                    <p>Inns: <strong className="text-white font-bold">{stat.batting?.innings || 0}</strong></p>
                    <p>Runs: <strong className="text-white font-bold">{stat.batting?.runs || 0}</strong></p>
                    <p>HS: <strong className="text-white font-bold">{stat.batting?.highestScore || 0}</strong></p>
                    <p>SR: <strong className="text-[#A3FF12] font-bold">{stat.batting?.strikeRate || 0}</strong></p>
                    <p>Avg: <strong className="text-white font-bold">{stat.batting?.average || 0}</strong></p>
                  </div>
                </div>

                {/* Bowling metrics box */}
                <div className="bg-[#0F1218] p-2.5 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-black text-white flex items-center gap-0.5 uppercase tracking-widest">
                    <TrendingUp size={10} /> Bowling
                  </span>
                  <div className="text-[11px] text-white/60 space-y-0.5 font-mono">
                    <p>Inns: <strong className="text-white font-bold">{stat.bowling?.innings || 0}</strong></p>
                    <p>Wkts: <strong className="text-white font-bold">{stat.bowling?.wickets || 0}</strong></p>
                    <p>Econ: <strong className="text-white font-bold">{stat.bowling?.economy || 0}</strong></p>
                    <p>Best: <strong className="text-[#A3FF12] font-bold">{stat.bowling?.bestWickets || 0}/{stat.bowling?.bestRuns || 0}</strong></p>
                  </div>
                </div>

                {/* Fielding & Awards box */}
                <div className="bg-[#0F1218] p-2.5 rounded-xl border border-white/5 space-y-1.5">
                  <span className="text-[10px] font-black text-white/50 flex items-center gap-0.5 uppercase tracking-widest">
                    <Award size={10} /> Fields
                  </span>
                  <div className="text-[11px] text-white/60 space-y-0.5 font-mono">
                    <p>Ctch: <strong className="text-white font-bold">{stat.fielding?.catches || 0}</strong></p>
                    <p>R-Out: <strong className="text-white font-bold">{stat.fielding?.runOuts || 0}</strong></p>
                    <p>Stmp: <strong className="text-white font-bold">{stat.fielding?.stumpings || 0}</strong></p>
                    <p>POTM: <strong className="text-[#A3FF12] font-bold">{stat.awards?.potm || 0}</strong></p>
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
