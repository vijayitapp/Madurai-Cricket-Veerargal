import React from 'react';
import { Match, Player, PlayerStats } from '../types';
import { Trophy, Zap, TrendingUp, Calendar, Users, Shield, Sparkles, Play, ArrowRight, Star, Award, MapPin, Clock } from 'lucide-react';

interface HomeDashboardProps {
  matches: Match[];
  playerStats: PlayerStats[];
  players: Player[];
  isAdminMode: boolean;
  onStartMatch: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function HomeDashboard({
  matches,
  playerStats,
  players,
  isAdminMode,
  onStartMatch,
  onNavigateToTab
}: HomeDashboardProps) {

  // Retrieve top 3 completed matches
  const completedMatches = matches
    .filter(m => m.status === 'completed' || m.status === 'aborted')
    .slice(0, 3);

  // Retrieve top 3 batters
  const topBatters = [...playerStats]
    .filter(s => s.batting.innings > 0)
    .sort((a, b) => b.batting.runs - a.batting.runs)
    .slice(0, 3);

  // Retrieve top 3 bowlers
  const topBowlers = [...playerStats]
    .filter(s => s.bowling.innings > 0)
    .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
    .slice(0, 3);

  const getPlayerName = (id: string) => {
    return players.find(p => p.id === id)?.name || 'Unknown';
  };

  const getUpcomingMatchDateTime = () => {
    const now = new Date();
    const resultDate = new Date();
    const dayOfWeek = now.getDay();
    const daysToAdd = (6 - dayOfWeek + 7) % 7;
    
    if (dayOfWeek === 6) {
      if (now.getHours() >= 16) {
        resultDate.setDate(now.getDate() + 7);
      } else {
        resultDate.setDate(now.getDate());
      }
    } else {
      resultDate.setDate(now.getDate() + daysToAdd);
    }
    
    resultDate.setHours(16, 0, 0, 0);
    
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    return `${resultDate.toLocaleDateString('en-US', options)} @ 4:00 PM IST (Local Time)`;
  };

  const getMedalEmoji = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `#${idx + 1}`;
  };

  return (
    <div className="space-y-6">
      
      {/* App Branding & Logo Hero Card */}
      <div className="relative bg-sleek-panel border border-sleek-border rounded-3xl p-6 md:p-8 overflow-hidden shadow-sleek-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sleek-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-16 h-16 bg-sleek-accent rounded-2xl flex items-center justify-center shadow-lg shadow-sleek-accent/20 animate-pulse">
              <span className="text-3xl text-black">🏏</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic text-sleek-text flex items-center justify-center md:justify-start gap-2">
                MADURAI CRICKET VEERARGAL
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* No Match Currently Live Status & Admin Setup Action */}
      <div className="bg-sleek-card border border-sleek-border p-6 rounded-3xl relative overflow-hidden shadow-sleek-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sleek-overlay flex items-center justify-center text-sleek-text-muted shrink-0 relative">
              <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <Clock size={20} />
            </div>
            <div className="space-y-1">
              <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block">
                No Active Live Match
              </span>
              <h3 className="font-extrabold text-sleek-text text-base">Stadium is Currently Quiet</h3>
            </div>
          </div>

          {isAdminMode ? (
            <button
              onClick={onStartMatch}
              className="w-full md:w-auto px-6 py-3.5 bg-sleek-accent hover:bg-sleek-accent-hover text-black text-xs font-black uppercase tracking-widest rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sleek-accent/10"
            >
              <Sparkles size={14} fill="currentColor" /> Start New Match
            </button>
          ) : (
            <div className="w-full md:w-auto px-4 py-2.5 bg-sleek-overlay rounded-xl border border-sleek-border text-xs text-sleek-text-muted uppercase tracking-widest font-mono text-center">
              🔒 Scorer Access Restricted
            </div>
          )}
        </div>
      </div>

      {/* Bento Grid: Upcoming Match Information & Recent Match Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Upcoming Match Card */}
        <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 flex flex-col justify-between gap-6 shadow-lg">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-sleek-accent uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={12} /> Next Upcoming Clash
              </span>
              <span className="text-xs bg-sleek-overlay text-sleek-text-muted px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                Weekend Series
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-lg font-black text-sleek-text leading-tight uppercase">
                Ramco Veerargal <span className="text-sleek-accent font-light">vs</span> Hard Workers
              </h4>
            </div>
          </div>

          <div className="space-y-3 border-t border-sleek-border pt-4">
            <div className="flex items-center gap-2 text-xs text-sleek-text-muted font-mono">
              <Clock size={14} className="text-sleek-accent" />
              <span>{getUpcomingMatchDateTime()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-sleek-text-muted font-mono">
              <MapPin size={14} className="text-sleek-accent" />
              <span>Turf, Byepass Road</span>
            </div>
          </div>
        </div>

        {/* Recent Match Results */}
        <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-sleek-accent uppercase tracking-widest flex items-center gap-1.5">
                <Trophy size={12} /> Recent Results
              </span>
              <button
                onClick={() => onNavigateToTab('history')}
                className="text-xs font-black text-sleek-text-muted hover:text-sleek-text uppercase tracking-wider cursor-pointer flex items-center gap-1 transition"
              >
                View History <ArrowRight size={10} />
              </button>
            </div>

            <div className="space-y-3.5">
              {completedMatches.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-sleek-border rounded-2xl text-xs text-sleek-text-muted font-mono uppercase tracking-widest">
                  No match archives recorded
                </div>
              ) : (
                completedMatches.map(match => {
                  const scoreFirst = match.scores[match.battingFirst || 'teamA'];
                  const scoreSecond = match.scores[match.battingFirst === 'teamA' ? 'teamB' : 'teamA'];
                  const firstTeamName = match.battingFirst === 'teamA' ? match.teamA.name : match.teamB.name;
                  const secondTeamName = match.battingFirst === 'teamA' ? match.teamB.name : match.teamA.name;
                  const isAborted = match.status === 'aborted';

                  return (
                    <div key={match.id} className="p-3 bg-sleek-overlay rounded-2xl border border-sleek-border flex items-center justify-between text-xs gap-3">
                      <div className="space-y-1 truncate">
                        <p className="font-extrabold text-sleek-text truncate uppercase tracking-tight flex items-center gap-1.5">
                          {firstTeamName.split(' ')[0]} <span className="text-xs text-sleek-text-muted font-normal">vs</span> {secondTeamName.split(' ')[0]}
                        </p>
                        <p className="text-xs font-mono text-sleek-accent font-black">
                          {isAborted ? (
                            <span className="text-amber-400">Match Incomplete</span>
                          ) : (
                            `Winner: ${match.winner === 'draw' ? 'Draw Match' : match.winner === 'teamA' ? match.teamA.name.split(' ')[0] : match.teamB.name.split(' ')[0]}`
                          )}
                        </p>
                      </div>
                      <div className="text-right font-mono text-sleek-text-muted shrink-0">
                        <p className="text-xs font-black text-sleek-text">{scoreFirst.runs}/{scoreFirst.wickets}</p>
                        <p className="text-xs">{scoreSecond.runs}/{scoreSecond.wickets}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Bento Grid: Leaderboard Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top Batters Preview */}
        <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-sleek-border pb-3">
            <span className="text-xs font-black text-sleek-accent uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={14} className="text-sleek-accent" /> Top Batters
            </span>
            <span className="text-[9px] text-sleek-text-muted font-mono uppercase">Runs Summary</span>
          </div>

          <div className="space-y-3">
            {topBatters.length === 0 ? (
              <p className="text-xs text-sleek-text-muted font-mono py-4 text-center uppercase tracking-widest">No batting statistics yet</p>
            ) : (
              topBatters.map((stat, idx) => (
                <div key={stat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 font-mono text-center font-bold text-sleek-text-muted">
                      {getMedalEmoji(idx)}
                    </span>
                    <div>
                      <p className="font-extrabold text-sleek-text">{stat.name}</p>
                      <p className="text-xs text-sleek-text-muted font-mono">Inns: {stat.batting.innings} &bull; SR: {stat.batting.strikeRate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sleek-accent text-sm">{stat.batting.runs}</p>
                    <p className="text-[9px] text-sleek-text-muted font-mono">Avg: {stat.batting.average}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Bowlers Preview */}
        <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-sleek-border pb-3">
            <span className="text-xs font-black text-sleek-accent uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} className="text-sleek-accent" /> Top Bowlers
            </span>
            <span className="text-[9px] text-sleek-text-muted font-mono uppercase">Wickets Summary</span>
          </div>

          <div className="space-y-3">
            {topBowlers.length === 0 ? (
              <p className="text-xs text-sleek-text-muted font-mono py-4 text-center uppercase tracking-widest">No bowling statistics yet</p>
            ) : (
              topBowlers.map((stat, idx) => (
                <div key={stat.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 font-mono text-center font-bold text-sleek-text-muted">
                      {getMedalEmoji(idx)}
                    </span>
                    <div>
                      <p className="font-extrabold text-sleek-text">{stat.name}</p>
                      <p className="text-xs text-sleek-text-muted font-mono">Inns: {stat.bowling.innings} &bull; Econ: {stat.bowling.economy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sleek-accent text-sm">{stat.bowling.wickets}</p>
                    <p className="text-[9px] text-sleek-text-muted font-mono">Avg: {stat.bowling.average}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Button to navigate to full leaderboard tab */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => onNavigateToTab('leaderboard')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-sleek-card border border-sleek-border hover:bg-sleek-overlay-hover text-sleek-accent text-xs font-black uppercase tracking-widest py-3.5 px-6 rounded-2xl transition cursor-pointer shadow-md"
        >
          <Award size={14} /> View All Player Stats & Leaderboards
        </button>
      </div>

    </div>
  );
}
