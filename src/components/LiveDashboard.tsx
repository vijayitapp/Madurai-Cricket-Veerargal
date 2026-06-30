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
      <div className="bg-sleek-panel rounded-3xl p-6 text-[#E0E0E0] relative overflow-hidden shadow-sleek-2xl border border-sleek-border">
        {/* Absolute glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-sleek-accent/5 rounded-full blur-3xl"></div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-sleek-accent bg-sleek-accent/10 px-2.5 py-1 rounded">
              LIVE SCORECARD
            </span>
          </div>
          <span className="text-xs bg-sleek-overlay px-2.5 py-1 rounded text-sleek-text-muted flex items-center gap-1 font-mono uppercase tracking-widest">
            <Calendar size={10} /> {new Date(match.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Team Names and Scores */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-sleek-accent">{battingTeamName}</h3>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-6xl sm:text-7xl font-black italic tracking-tighter text-sleek-text">{battingScore.runs}<span className="text-sleek-accent font-light mx-1">/</span>{battingScore.wickets}</span>
              <span className="text-xs text-sleek-text-muted mb-2 font-mono uppercase">({match.oversCompleted}.{match.ballsInOver} / {match.overs} Ov)</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-sleek-text-muted uppercase font-black tracking-widest">Innings {match.currentInnings}</span>
            {match.currentInnings === 2 && match.target && (
              <p className="text-sm font-bold text-sleek-accent mt-1 font-mono">TARGET: {match.target}</p>
            )}
            <p className="text-xs text-sleek-text-muted mt-1 font-mono">
              CRR: <span className="text-sleek-accent font-bold">{parseFloat((battingScore.runs / ((match.oversCompleted * 6 + match.ballsInOver) / 6 || 1)).toFixed(2))}</span>
            </p>
          </div>
        </div>

        {/* Target Details for Chase */}
        {match.currentInnings === 2 && match.target && (
          <div className="mt-6 pt-4 border-t border-sleek-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-sleek-text-muted font-mono uppercase tracking-wider">
            <span>Need <strong className="text-sleek-text font-bold">{match.target - battingScore.runs}</strong> runs off <strong className="text-sleek-text font-bold">{(match.overs * 6) - (match.oversCompleted * 6 + match.ballsInOver)}</strong> balls</span>
            <span>Req RR: <strong className="text-sleek-accent font-bold">{parseFloat(((match.target - battingScore.runs) / (((match.overs * 6) - (match.oversCompleted * 6 + match.ballsInOver)) / 6 || 1)).toFixed(2))}</strong></span>
          </div>
        )}
      </div>

      {/* Mini live run tracking bar */}
      <div className="bg-sleek-card border border-sleek-border p-5 rounded-2xl shadow-sm space-y-3">
        <span className="text-xs font-black text-sleek-accent uppercase tracking-[0.2em] block">Recent Balls (This Over)</span>
        <div className="flex flex-wrap items-center gap-2">
          {last6Balls.length === 0 ? (
            <span className="text-xs text-sleek-text-muted italic">Over starting...</span>
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
                      ? 'bg-sleek-accent text-black shadow-md shadow-sleek-accent/20'
                      : isExtra
                      ? 'bg-sleek-overlay-hover text-sleek-text border border-sleek-border'
                      : 'bg-sleek-overlay text-sleek-text-muted border border-sleek-border'
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
        <div className="bg-sleek-card border border-sleek-border rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-sleek-accent uppercase tracking-[0.15em] flex items-center gap-1.5 border-b border-sleek-border pb-3">
            <Zap size={14} /> Batting Live
          </h4>
          <div className="space-y-3">
            {strikerId && strikerStats ? (
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-sleek-accent">&#9733;</span>
                  <span className="font-bold text-sleek-text">{getShorterName(strikerId)} *</span>
                </div>
                <span className="font-black text-sleek-text">{strikerStats.runs} <span className="text-xs text-sleek-text-muted font-normal font-mono">({strikerStats.balls}b, {strikerStats.fours}x4, {strikerStats.sixes}x6)</span></span>
              </div>
            ) : (
              <p className="text-xs text-sleek-text-muted italic">No active striker yet</p>
            )}

            {nonStrikerId && nonStrikerStats ? (
              <div className="flex justify-between items-center text-xs pl-4 border-l border-sleek-border">
                <span className="font-medium text-sleek-text-muted">{getShorterName(nonStrikerId)}</span>
                <span className="font-black text-sleek-text-muted">{nonStrikerStats.runs} <span className="text-xs text-sleek-text-muted font-normal font-mono">({nonStrikerStats.balls}b, {nonStrikerStats.fours}x4, {nonStrikerStats.sixes}x6)</span></span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bowling details */}
        <div className="bg-sleek-card border border-sleek-border rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-sleek-text uppercase tracking-[0.15em] flex items-center gap-1.5 border-b border-sleek-border pb-3">
            <Activity size={14} /> Bowling Live
          </h4>
          {currentBowlerId && bowlerStats ? (
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-sleek-text">{getShorterName(currentBowlerId)}</span>
              <span className="font-black text-sleek-accent font-mono">
                {bowlerStats.wickets} <span className="text-xs text-sleek-text-muted font-normal font-sans">for {bowlerStats.runs} runs (Econ: {bowlerStats.economy})</span>
              </span>
            </div>
          ) : (
            <p className="text-xs text-sleek-text-muted italic">Waiting for next bowler...</p>
          )}
        </div>
      </div>

      {/* Match Partnership */}
      <div className="bg-sleek-panel border border-sleek-border p-4 rounded-2xl flex items-center justify-between text-xs font-mono uppercase tracking-wider">
        <span className="font-bold text-sleek-text-muted">Current Partnership:</span>
        <strong className="text-sleek-text font-black">
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
          className="w-full flex items-center justify-center gap-2 bg-sleek-card border border-sleek-border hover:bg-sleek-overlay-hover text-sleek-accent text-xs font-black uppercase tracking-widest py-3.5 px-5 rounded-2xl transition cursor-pointer shadow-sm"
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
        <div className="bg-sleek-card border border-sleek-border rounded-2xl p-5 shadow-sleek-xl space-y-5 animate-in fade-in duration-200">
          {/* Innings Switcher Tabs */}
          <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-sleek-border">
            <button
              onClick={() => setScorecardInnings('innings1')}
              className={`flex-1 py-2 text-center text-xs sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                scorecardInnings === 'innings1'
                  ? 'bg-sleek-accent text-black shadow-md'
                  : 'text-sleek-text-muted hover:text-sleek-text'
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
              className={`flex-1 py-2 text-center text-xs sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                match.currentInnings < 2 && match.status !== 'completed'
                  ? 'text-sleek-text/20 cursor-not-allowed'
                  : scorecardInnings === 'innings2'
                  ? 'bg-sleek-accent text-black shadow-md cursor-pointer'
                  : 'text-sleek-text-muted hover:text-sleek-text cursor-pointer'
              }`}
            >
              2nd Inns: {teamSecondName.split(' ')[0]} ({scoreSecond.runs}/{scoreSecond.wickets})
            </button>
          </div>

          {/* Innings Summary Title */}
          <div className="flex justify-between items-center border-b border-sleek-border pb-2">
            <span className="text-xs font-black text-sleek-text uppercase tracking-wider">
              {currentScorecardTeamName} Batting
            </span>
            <span className="text-xs font-mono font-bold text-sleek-accent">
              {scorecardInnings === 'innings1' ? scoreFirst.runs : scoreSecond.runs}/{scorecardInnings === 'innings1' ? scoreFirst.wickets : scoreSecond.wickets} ({currentScorecardOversVal} Overs)
            </span>
          </div>

          {/* Batting Scorecard (Responsive) */}
          <div className="w-full text-xs">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_40px_40px_40px_40px_50px] gap-2 border-b border-sleek-border text-sleek-text-muted uppercase text-[10px] tracking-widest pb-2 font-black">
              <div>Batter</div>
              <div>Dismissal</div>
              <div className="text-right">R</div>
              <div className="text-right">B</div>
              <div className="text-right">4s</div>
              <div className="text-right">6s</div>
              <div className="text-right">SR</div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-white/5">
              {currentScorecardInningsData.batting.length === 0 ? (
                <div className="py-4 text-center text-sleek-text-muted italic">Innings hasn't started yet</div>
              ) : (
                currentScorecardInningsData.batting.map(b => {
                  const isCurrentLive = b.playerId === strikerId || b.playerId === nonStrikerId;
                  const dismissal = getDismissalText(b);
                  return (
                    <div key={b.playerId} className={`flex flex-col md:grid md:grid-cols-[1.5fr_1.5fr_40px_40px_40px_40px_50px] gap-y-1 md:gap-y-0 gap-x-2 py-3 hover:bg-sleek-overlay transition-colors px-1 ${isCurrentLive ? 'bg-sleek-accent/5' : ''}`}>
                      
                      {/* Mobile Row 1 / Desktop Col 1 & 3 */}
                      <div className="flex justify-between items-start md:contents">
                        <div className="font-bold text-sleek-text flex items-center gap-1.5 truncate">
                          {b.name}
                          {isCurrentLive && (
                            <span className="flex h-2 w-2 relative flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sleek-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-sleek-accent"></span>
                            </span>
                          )}
                        </div>
                        <div className="font-mono font-black text-sleek-text text-sm md:text-right">{b.runs}</div>
                      </div>

                      {/* Mobile Row 2 / Desktop Col 2 */}
                      <div className="text-sleek-text-muted font-medium text-xs truncate max-w-[200px] md:max-w-none">
                        {dismissal === 'batting' ? (
                          <span className="text-sleek-accent font-black uppercase tracking-wider text-[10px] bg-sleek-accent/10 px-1.5 py-0.5 rounded">Batting</span>
                        ) : dismissal === 'not out' ? (
                          <span className="text-sleek-text-muted font-bold uppercase tracking-wider text-[9px] bg-sleek-overlay px-1.5 py-0.5 rounded">not out</span>
                        ) : (
                          dismissal
                        )}
                      </div>

                      {/* Mobile Row 3 / Desktop Cols 4, 5, 6, 7 */}
                      <div className="flex items-center gap-4 text-sleek-text-muted font-mono text-xs mt-1 md:mt-0 md:contents">
                        <div className="md:text-right"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">B</span>{b.balls}</div>
                        <div className="md:text-right"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">4s</span>{b.fours}</div>
                        <div className="md:text-right"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">6s</span>{b.sixes}</div>
                        <div className="md:text-right"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">SR</span>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Extras and Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/20 border border-sleek-border rounded-xl p-3.5 gap-2 text-xs font-mono">
            <div>
              <span className="font-bold text-sleek-text-muted uppercase tracking-wider text-xs">Extras:</span>{' '}
              <strong className="text-sleek-text font-black">{currentScorecardInningsData.extras?.total || 0}</strong>{' '}
              <span className="text-sleek-text-muted text-xs">
                (wd {currentScorecardInningsData.extras?.wide || 0}, nb {currentScorecardInningsData.extras?.noBall || 0}, b {currentScorecardInningsData.extras?.bye || 0})
              </span>
            </div>
            <div className="text-sleek-text-muted uppercase text-xs">
              Runs from bat:{' '}
              <strong className="text-sleek-text font-bold">
                {currentScorecardInningsData.batting.reduce((sum, b) => sum + b.runs, 0)}
              </strong>
            </div>
          </div>

          {/* Bowling Title */}
          <div className="border-b border-sleek-border pb-2 pt-2">
            <span className="text-xs font-black text-sleek-text uppercase tracking-wider">
              {scorecardInnings === 'innings1' ? teamSecondName : teamFirstName} Bowling
            </span>
          </div>

          {/* Bowling Scorecard (Responsive) */}
          <div className="w-full text-xs">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-[1.5fr_40px_40px_40px_40px_50px] gap-2 border-b border-sleek-border text-sleek-text-muted uppercase text-[10px] tracking-widest pb-2 font-black">
              <div>Bowler</div>
              <div className="text-right">O</div>
              <div className="text-right">M</div>
              <div className="text-right">R</div>
              <div className="text-right">W</div>
              <div className="text-right">ECON</div>
            </div>
            
            {/* Rows */}
            <div className="divide-y divide-white/5">
              {(scorecardInnings === 'innings1' ? scoreSecond : scoreFirst).bowling.length === 0 ? (
                <div className="py-4 text-center text-sleek-text-muted italic">No overs bowled yet</div>
              ) : (
                (scorecardInnings === 'innings1' ? scoreSecond : scoreFirst).bowling.map(b => {
                  const isCurrentLiveBowler = b.playerId === currentBowlerId;
                  const bowlerOvers = getOversFromBalls(b.balls);
                  const bowlerEconomy = b.balls > 0 ? ((b.runs / (b.balls / 6)).toFixed(2)) : '0.00';
                  return (
                    <div key={b.playerId} className={`flex flex-col md:grid md:grid-cols-[1.5fr_40px_40px_40px_40px_50px] gap-y-1 md:gap-y-0 gap-x-2 py-3 hover:bg-sleek-overlay transition-colors px-1 ${isCurrentLiveBowler ? 'bg-sleek-accent/5' : ''}`}>
                      
                      {/* Mobile Row 1 / Desktop Col 1 & 5 */}
                      <div className="flex justify-between items-start md:contents">
                        <div className="font-bold text-sleek-text flex items-center gap-1.5 truncate">
                          {b.name}
                          {isCurrentLiveBowler && (
                            <span className="flex h-2 w-2 relative flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sleek-accent opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-sleek-accent"></span>
                            </span>
                          )}
                        </div>
                        <div className="font-mono font-black text-sleek-accent text-sm md:col-start-5 md:text-right">{b.wickets} <span className="md:hidden text-[9px] font-sans font-bold text-sleek-text-muted">WKTS</span></div>
                      </div>

                      {/* Mobile Row 2 / Desktop Cols 2, 3, 4, 6 */}
                      <div className="flex items-center gap-4 text-sleek-text-muted font-mono text-xs mt-1 md:mt-0 md:contents">
                        <div className="md:text-right md:col-start-2"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">O</span>{bowlerOvers}</div>
                        <div className="md:text-right md:col-start-3"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">M</span>{b.maidens}</div>
                        <div className="md:text-right md:col-start-4"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">R</span>{b.runs}</div>
                        <div className="md:text-right md:col-start-6"><span className="md:hidden text-[9px] uppercase tracking-wider text-sleek-border mr-1 font-sans">ECON</span>{bowlerEconomy}</div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
