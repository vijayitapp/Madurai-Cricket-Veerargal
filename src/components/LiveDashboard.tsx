import React, { useState } from 'react';
import { Match, Player, BatterMatchStats } from '../types';
import { Activity, Trophy, Users, Zap, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface LiveDashboardProps {
  match: Match;
  players: Player[];
}

export default function LiveDashboard({ match, players }: LiveDashboardProps) {
  const [showFullScorecard, setShowFullScorecard] = useState(false);
  const [scorecardInnings, setScorecardInnings] = useState<'innings1' | 'innings2'>('innings1');

  // Resolve player names
  const getPlayerName = (id: string) => {
    if (id === match.doubleSidedPlayerId) {
      const p = players.find(x => x.id === id);
      return p ? `${p.name} (DS)` : 'Unknown';
    }
    return players.find(p => p.id === id)?.name || 'Unknown';
  };

  const getShorterName = (id: string) => {
    const full = getPlayerName(id);
    return full.split(' ')[0] || full;
  };

  const isFirstInnings = match.currentInnings === 1;
  const battingTeamKey = isFirstInnings
    ? (match.battingFirst || 'teamA')
    : (match.battingFirst === 'teamA' ? 'teamB' : 'teamA');
  const bowlingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';

  const battingTeamName = battingTeamKey === 'teamA' ? match.teamA.name : match.teamB.name;
  const bowlingTeamName = bowlingTeamKey === 'teamA' ? match.teamA.name : match.teamB.name;

  const battingScore = match.scores[battingTeamKey];
  const bowlingScore = match.scores[bowlingTeamKey];

  const strikerId = match.currentBatter1Id;
  const nonStrikerId = match.currentBatter2Id;
  const currentBowlerId = match.currentBowlerId;

  // Resolve team configurations for Full Scorecard
  const teamFirstKey = match.battingFirst || 'teamA';
  const teamSecondKey = teamFirstKey === 'teamA' ? 'teamB' : 'teamA';

  const teamFirstName = teamFirstKey === 'teamA' ? match.teamA.name : match.teamB.name;
  const teamSecondName = teamFirstKey === 'teamA' ? match.teamB.name : match.teamA.name;

  const scoreFirst = match.scores[teamFirstKey];
  const scoreSecond = match.scores[teamSecondKey];

  const getDismissalText = (b: BatterMatchStats) => {
    if (!b.dismissed) {
      if (b.playerId === strikerId || b.playerId === nonStrikerId) {
        return 'batting';
      }
      return 'not out';
    }

    const bowlerName = b.bowlerId ? getPlayerName(b.bowlerId) : '';
    const fielderName = b.dismissedBy || '';

    switch (b.dismissalType) {
      case 'bowled':
        return `b ${bowlerName}`;
      case 'caught':
        return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
      case 'runout':
        return fielderName ? `run out (${fielderName})` : 'run out';
      case 'stumped':
        return fielderName ? `stumped ${fielderName} b ${bowlerName}` : `stumped b ${bowlerName}`;
      case 'lbw':
        return `lbw b ${bowlerName}`;
      case 'hit_wicket':
        return `hit wicket b ${bowlerName}`;
      default:
        return 'out';
    }
  };

  const getOversFromBalls = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const extraBalls = balls % 6;
    return `${overs}.${extraBalls}`;
  };

  const currentScorecardInningsData = scorecardInnings === 'innings1' ? scoreFirst : scoreSecond;
  const currentScorecardTeamName = scorecardInnings === 'innings1' ? teamFirstName : teamSecondName;
  const currentScorecardOversVal = scorecardInnings === 'innings1' 
    ? (match.currentInnings === 1 ? getOversFromBalls(scoreFirst.balls) : `${match.overs}.0`)
    : (match.currentInnings === 2 ? getOversFromBalls(scoreSecond.balls) : (match.status === 'completed' ? getOversFromBalls(scoreSecond.balls) : '0.0'));

  // Last 6 balls list from timeline
  const getLastBalls = () => {
    const events = match.timeline || [];
    return events.slice(-6).map(e => {
      if (e.isWicket) return 'W';
      if (e.extraType === 'wide') return 'Wd';
      if (e.extraType === 'noBall') return 'Nb';
      return e.runs.toString();
    });
  };

  const last6Balls = getLastBalls();

  const strikerStats = strikerId ? battingScore.batting.find(b => b.playerId === strikerId) : null;
  const nonStrikerStats = nonStrikerId ? battingScore.batting.find(b => b.playerId === nonStrikerId) : null;
  const bowlerStats = currentBowlerId ? bowlingScore.bowling.find(b => b.playerId === currentBowlerId) : null;

  return (
    <div className="space-y-6">
      {/* Live Match Card */}
      <div className="bg-[#0F1218] rounded-3xl p-6 text-[#E0E0E0] relative overflow-hidden shadow-2xl border border-white/10">
        {/* Absolute glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#A3FF12]/5 rounded-full blur-3xl"></div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3FF12] bg-[#A3FF12]/10 px-2.5 py-1 rounded">
              LIVE SCORECARD
            </span>
          </div>
          <span className="text-[10px] bg-white/5 px-2.5 py-1 rounded text-white/40 flex items-center gap-1 font-mono uppercase tracking-widest">
            <Calendar size={10} /> {new Date(match.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Team Names and Scores */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#A3FF12]">{battingTeamName}</h3>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-6xl sm:text-7xl font-black italic tracking-tighter text-white">{battingScore.runs}<span className="text-[#A3FF12] font-light mx-1">/</span>{battingScore.wickets}</span>
              <span className="text-xs text-white/40 mb-2 font-mono uppercase">({match.oversCompleted}.{match.ballsInOver} / {match.overs} Ov)</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Innings {match.currentInnings}</span>
            {match.currentInnings === 2 && match.target && (
              <p className="text-sm font-bold text-[#A3FF12] mt-1 font-mono">TARGET: {match.target}</p>
            )}
            <p className="text-xs text-white/60 mt-1 font-mono">
              CRR: <span className="text-[#A3FF12] font-bold">{parseFloat((battingScore.runs / ((match.oversCompleted * 6 + match.ballsInOver) / 6 || 1)).toFixed(2))}</span>
            </p>
          </div>
        </div>

        {/* Target Details for Chase */}
        {match.currentInnings === 2 && match.target && (
          <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-white/60 font-mono uppercase tracking-wider">
            <span>Need <strong className="text-white font-bold">{match.target - battingScore.runs}</strong> runs off <strong className="text-white font-bold">{(match.overs * 6) - (match.oversCompleted * 6 + match.ballsInOver)}</strong> balls</span>
            <span>Req RR: <strong className="text-[#A3FF12] font-bold">{parseFloat(((match.target - battingScore.runs) / (((match.overs * 6) - (match.oversCompleted * 6 + match.ballsInOver)) / 6 || 1)).toFixed(2))}</strong></span>
          </div>
        )}
      </div>

      {/* Mini live run tracking bar */}
      <div className="bg-[#14181F] border border-white/5 p-5 rounded-2xl shadow-sm space-y-3">
        <span className="text-[10px] font-black text-[#A3FF12] uppercase tracking-[0.2em] block">Recent Balls (This Over)</span>
        <div className="flex flex-wrap items-center gap-2">
          {last6Balls.length === 0 ? (
            <span className="text-xs text-white/40 italic">Over starting...</span>
          ) : (
            last6Balls.map((b, i) => {
              const isBoundary = b === '4' || b === '6';
              const isWicket = b === 'W';
              const isExtra = b === 'Wd' || b === 'Nb';

              return (
                <span
                  key={i}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                    isWicket
                      ? 'bg-red-600/20 text-red-500 border border-red-500/50 animate-pulse'
                      : isBoundary
                      ? 'bg-[#A3FF12] text-black shadow-md shadow-[#A3FF12]/20'
                      : isExtra
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'bg-white/5 text-white/60 border border-white/5'
                  }`}
                >
                  {b}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Batter & Bowler stats breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batting details */}
        <div className="bg-[#14181F] border border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-[#A3FF12] uppercase tracking-[0.15em] flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Zap size={14} /> Batting Live
          </h4>
          <div className="space-y-3">
            {strikerId && strikerStats ? (
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A3FF12]">&#9733;</span>
                  <span className="font-bold text-white">{getShorterName(strikerId)} *</span>
                </div>
                <span className="font-black text-white">{strikerStats.runs} <span className="text-[10px] text-white/40 font-normal font-mono">({strikerStats.balls}b, {strikerStats.fours}x4, {strikerStats.sixes}x6)</span></span>
              </div>
            ) : (
              <p className="text-xs text-white/40 italic">No active striker yet</p>
            )}

            {nonStrikerId && nonStrikerStats ? (
              <div className="flex justify-between items-center text-xs pl-4 border-l border-white/10">
                <span className="font-medium text-white/60">{getShorterName(nonStrikerId)}</span>
                <span className="font-black text-white/80">{nonStrikerStats.runs} <span className="text-[10px] text-white/40 font-normal font-mono">({nonStrikerStats.balls}b, {nonStrikerStats.fours}x4, {nonStrikerStats.sixes}x6)</span></span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bowling details */}
        <div className="bg-[#14181F] border border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-white uppercase tracking-[0.15em] flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Activity size={14} /> Bowling Live
          </h4>
          {currentBowlerId && bowlerStats ? (
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white">{getShorterName(currentBowlerId)}</span>
              <span className="font-black text-[#A3FF12] font-mono">
                {bowlerStats.wickets} <span className="text-[10px] text-white/40 font-normal font-sans">for {bowlerStats.runs} runs (Econ: {bowlerStats.economy})</span>
              </span>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic">Waiting for next bowler...</p>
          )}
        </div>
      </div>

      {/* Match Partnership */}
      <div className="bg-[#0F1218] border border-white/5 p-4 rounded-2xl flex items-center justify-between text-xs font-mono uppercase tracking-wider">
        <span className="font-bold text-white/40">Current Partnership:</span>
        <strong className="text-white font-black">
          {battingScore.batting
            .filter(b => !b.dismissed && (b.playerId === strikerId || b.playerId === nonStrikerId))
            .reduce((sum, b) => sum + b.runs, 0)}{' '}
          runs off{' '}
          {battingScore.batting
            .filter(b => !b.dismissed && (b.playerId === strikerId || b.playerId === nonStrikerId))
            .reduce((sum, b) => sum + b.balls, 0)}{' '}
          balls
        </strong>
      </div>

      {/* View Full Scorecard Toggle Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => setShowFullScorecard(!showFullScorecard)}
          className="w-full flex items-center justify-center gap-2 bg-[#14181F] border border-white/5 hover:bg-white/10 text-[#A3FF12] text-xs font-black uppercase tracking-widest py-3.5 px-5 rounded-2xl transition cursor-pointer shadow-sm"
        >
          {showFullScorecard ? (
            <>
              <ChevronUp size={16} /> Hide Full Scorecard
            </>
          ) : (
            <>
              <ChevronDown size={16} /> View Full Scorecard
            </>
          )}
        </button>
      </div>

      {/* Full Scorecard Details */}
      {showFullScorecard && (
        <div className="bg-[#14181F] border border-white/5 rounded-2xl p-5 shadow-xl space-y-5 animate-in fade-in duration-200">
          {/* Innings Switcher Tabs */}
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
            <button
              onClick={() => setScorecardInnings('innings1')}
              className={`flex-1 py-2 text-center text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                scorecardInnings === 'innings1'
                  ? 'bg-[#A3FF12] text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              1st Inns: {teamFirstName.split(' ')[0]} ({scoreFirst.runs}/{scoreFirst.wickets})
            </button>
            <button
              onClick={() => {
                if (match.currentInnings >= 2 || match.status === 'completed') {
                  setScorecardInnings('innings2');
                }
              }}
              disabled={match.currentInnings < 2 && match.status !== 'completed'}
              className={`flex-1 py-2 text-center text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                match.currentInnings < 2 && match.status !== 'completed'
                  ? 'text-white/20 cursor-not-allowed'
                  : scorecardInnings === 'innings2'
                  ? 'bg-[#A3FF12] text-black shadow-md cursor-pointer'
                  : 'text-white/60 hover:text-white cursor-pointer'
              }`}
            >
              2nd Inns: {teamSecondName.split(' ')[0]} ({scoreSecond.runs}/{scoreSecond.wickets})
            </button>
          </div>

          {/* Innings Summary Title */}
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {currentScorecardTeamName} Batting
            </span>
            <span className="text-xs font-mono font-bold text-[#A3FF12]">
              {scorecardInnings === 'innings1' ? scoreFirst.runs : scoreSecond.runs}/{scorecardInnings === 'innings1' ? scoreFirst.wickets : scoreSecond.wickets} ({currentScorecardOversVal} Overs)
            </span>
          </div>

          {/* Batting Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[450px]">
              <thead>
                <tr className="border-b border-white/5 text-white/40 uppercase text-[10px] tracking-widest">
                  <th className="pb-2 font-black">Batter</th>
                  <th className="pb-2 font-black">Dismissal</th>
                  <th className="pb-2 text-right font-black w-12">R</th>
                  <th className="pb-2 text-right font-black w-12">B</th>
                  <th className="pb-2 text-right font-black w-10">4s</th>
                  <th className="pb-2 text-right font-black w-10">6s</th>
                  <th className="pb-2 text-right font-black w-14">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentScorecardInningsData.batting.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-white/40 italic">
                      Innings hasn't started yet
                    </td>
                  </tr>
                ) : (
                  currentScorecardInningsData.batting.map(b => {
                    const isCurrentLive = b.playerId === strikerId || b.playerId === nonStrikerId;
                    const dismissal = getDismissalText(b);
                    return (
                      <tr key={b.playerId} className={`hover:bg-white/5 transition-colors ${isCurrentLive ? 'bg-[#A3FF12]/5' : ''}`}>
                        <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                          {b.name}
                          {isCurrentLive && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3FF12] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3FF12]"></span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-white/50 font-medium text-[11px] truncate max-w-[150px]">
                          {dismissal === 'batting' ? (
                            <span className="text-[#A3FF12] font-black uppercase tracking-wider text-[10px] bg-[#A3FF12]/10 px-1.5 py-0.5 rounded">Batting</span>
                          ) : dismissal === 'not out' ? (
                            <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] bg-white/5 px-1.5 py-0.5 rounded">not out</span>
                          ) : (
                            dismissal
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-black text-white text-sm">{b.runs}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">{b.balls}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">{b.fours}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">{b.sixes}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">
                          {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Extras and Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/20 border border-white/5 rounded-xl p-3.5 gap-2 text-xs font-mono">
            <div>
              <span className="font-bold text-white/40 uppercase tracking-wider text-[10px]">Extras:</span>{' '}
              <strong className="text-white font-black">{currentScorecardInningsData.extras?.total || 0}</strong>{' '}
              <span className="text-white/40 text-[11px]">
                (wd {currentScorecardInningsData.extras?.wide || 0}, nb {currentScorecardInningsData.extras?.noBall || 0}, b {currentScorecardInningsData.extras?.bye || 0}, lb {currentScorecardInningsData.extras?.legBye || 0})
              </span>
            </div>
            <div className="text-white/40 uppercase text-[11px]">
              Runs from bat:{' '}
              <strong className="text-white font-bold">
                {currentScorecardInningsData.batting.reduce((sum, b) => sum + b.runs, 0)}
              </strong>
            </div>
          </div>

          {/* Bowling Title */}
          <div className="border-b border-white/5 pb-2 pt-2">
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {scorecardInnings === 'innings1' ? teamSecondName : teamFirstName} Bowling
            </span>
          </div>

          {/* Bowling Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[450px]">
              <thead>
                <tr className="border-b border-white/5 text-white/40 uppercase text-[10px] tracking-widest">
                  <th className="pb-2 font-black">Bowler</th>
                  <th className="pb-2 text-right font-black w-14">Overs</th>
                  <th className="pb-2 text-right font-black w-12">Maidens</th>
                  <th className="pb-2 text-right font-black w-12">Runs</th>
                  <th className="pb-2 text-right font-black w-12">Wickets</th>
                  <th className="pb-2 text-right font-black w-16">Econ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(scorecardInnings === 'innings1' ? scoreSecond : scoreFirst).bowling.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-white/40 italic">
                      No overs bowled yet
                    </td>
                  </tr>
                ) : (
                  (scorecardInnings === 'innings1' ? scoreSecond : scoreFirst).bowling.map(b => {
                    const isCurrentLiveBowler = b.playerId === currentBowlerId;
                    const bowlerOvers = getOversFromBalls(b.balls);
                    const bowlerEconomy = b.balls > 0 ? ((b.runs / (b.balls / 6)).toFixed(2)) : '0.00';
                    return (
                      <tr key={b.playerId} className={`hover:bg-white/5 transition-colors ${isCurrentLiveBowler ? 'bg-[#A3FF12]/5' : ''}`}>
                        <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                          {b.name}
                          {isCurrentLiveBowler && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3FF12] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A3FF12]"></span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-white text-sm">{bowlerOvers}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">{b.maidens}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">{b.runs}</td>
                        <td className="py-2.5 text-right font-mono font-black text-[#A3FF12] text-sm">{b.wickets}</td>
                        <td className="py-2.5 text-right font-mono text-white/50">{bowlerEconomy}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
