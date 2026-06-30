import React from 'react';
import { Play } from 'lucide-react';

interface ScorecardDisplayProps {
  match: any;
  battingTeam: any;
  bowlingTeam: any;
  battingScore: any;
  bowlingScore: any;
  strikerId: string;
  nonStrikerId: string;
  currentBowlerId: string | null;
  strikerStats: any;
  nonStrikerStats: any;
  activeBowlerStats: any;
  partnership: { runs: number; balls: number };
  currentOversCompleted: number;
  currentOverBalls: number;
  getShorterName: (id: string) => string;
  setShowBowlerModal: (show: boolean) => void;
}

export function ScorecardDisplay({
  match, battingTeam, bowlingTeam, battingScore, bowlingScore,
  strikerId, nonStrikerId, currentBowlerId,
  strikerStats, nonStrikerStats, activeBowlerStats,
  partnership, currentOversCompleted, currentOverBalls,
  getShorterName, setShowBowlerModal
}: ScorecardDisplayProps) {
  const displayOverIndex = currentOverBalls === 0 && currentOversCompleted > 0 ? currentOversCompleted - 1 : currentOversCompleted;
  const thisOverEvents = match.timeline ? match.timeline.filter((t: any) => t.overIndex === displayOverIndex) : [];
  
  let thisOverRuns = 0;
  let thisOverWickets = 0;
  let thisOverExtras = 0;
  thisOverEvents.forEach((t: any) => {
    thisOverRuns += t.runs + t.extraRuns;
    if (t.isWicket) thisOverWickets += 1;
    if (t.extraRuns > 0) thisOverExtras += t.extraRuns;
  });

  return (
    <div className="space-y-4">
      {/* New Header */}
      <div className="bg-sleek-card rounded-2xl p-4 shadow-sleek-2xl border border-sleek-border flex justify-between items-center relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10 w-2/5">
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(battingTeam.name)}&background=111111&color=fff&rounded=full&bold=true&size=128`} className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-sleek-border shadow-md" alt="Team A" />
          <div className="min-w-0 flex-1">
            <div className="text-xs md:text-sm font-extrabold text-sleek-text truncate">{battingTeam.name}</div>
            <div className="text-xl md:text-2xl font-black text-sleek-text font-mono leading-none mt-1">{battingScore.runs}/{battingScore.wickets}</div>
            <div className="text-[10px] md:text-xs text-sleek-text-muted mt-1 font-mono">({currentOversCompleted}.{currentOverBalls} ov)</div>
          </div>
        </div>

        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-sleek-overlay border border-sleek-border flex items-center justify-center text-[9px] md:text-[10px] font-black text-sleek-text-muted relative z-10 shrink-0">
          VS
        </div>

        <div className="flex items-center gap-3 relative z-10 text-right w-2/5 justify-end">
          <div className="min-w-0 flex-1">
            <div className="text-xs md:text-sm font-extrabold text-sleek-text truncate">{bowlingTeam.name}</div>
            {match.currentInnings === 1 && (
              <div className="text-[10px] md:text-xs text-sleek-text-muted mt-1">Yet to Bat</div>
            )}
          </div>
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(bowlingTeam.name)}&background=111111&color=fff&rounded=full&bold=true&size=128`} className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-sleek-border shadow-md" alt="Team B" />
        </div>
      </div>

      {/* Black Info Banner */}
      <div className="bg-[#0A101D] border border-sleek-border/50 rounded-xl p-3 text-xs shadow-inner">
        <div className="flex justify-around text-center divide-x divide-sleek-border/30">
          {/* CRR — always shown */}
          <div className="px-2 flex-1">
            <span className="text-sleek-text-muted block text-[9px] uppercase font-bold tracking-widest">CRR</span>
            <span className="text-sleek-text font-mono font-bold text-sm">
              {parseFloat((battingScore.runs / ((currentOversCompleted * 6 + currentOverBalls) / 6 || 1)).toFixed(2))}
            </span>
          </div>

          {match.currentInnings === 1 ? (
            // 1st Innings: show Projected Score and Balls Remaining
            <>
              <div className="px-2 flex-1">
                <span className="text-sleek-text-muted block text-[9px] uppercase font-bold tracking-widest">Projected</span>
                <span className="text-sleek-accent font-mono font-bold text-sm">
                  {Math.round(
                    (battingScore.runs / ((currentOversCompleted * 6 + currentOverBalls) || 1)) * (match.overs * 6)
                  )}
                </span>
              </div>
              <div className="px-2 flex-1">
                <span className="text-sleek-text-muted block text-[9px] uppercase font-bold tracking-widest">Balls Left</span>
                <span className="text-sleek-text font-mono font-bold text-sm">
                  {(match.overs * 6) - (currentOversCompleted * 6 + currentOverBalls)}
                </span>
              </div>
            </>
          ) : (
            // 2nd Innings: show RRR and Target
            match.target && (
              <>
                <div className="px-2 flex-1">
                  <span className="text-sleek-text-muted block text-[9px] uppercase font-bold tracking-widest">RRR</span>
                  <span className="text-sleek-text font-mono font-bold text-sm">
                    {parseFloat((((match.target || 0) - battingScore.runs) / (((match.overs * 6) - (currentOversCompleted * 6 + currentOverBalls)) / 6 || 1)).toFixed(2))}
                  </span>
                </div>
                <div className="px-2 flex-1">
                  <span className="text-sleek-text-muted block text-[9px] uppercase font-bold tracking-widest">Target</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">{match.target}</span>
                </div>
              </>
            )
          )}
        </div>

        {/* 2nd innings need-X-in-Y summary */}
        {match.currentInnings === 2 && match.target && (
          <div className="text-center mt-2 pt-2 border-t border-sleek-border/20">
            <span className="text-sleek-text-muted text-[10px]">{battingTeam.name} need </span>
            <span className="text-amber-400 font-bold text-xs">{(match.target || 0) - battingScore.runs}</span>
            <span className="text-sleek-text-muted text-[10px]"> runs in </span>
            <span className="text-amber-400 font-bold text-xs">{(match.overs * 6) - (currentOversCompleted * 6 + currentOverBalls)}</span>
            <span className="text-sleek-text-muted text-[10px]"> balls</span>
          </div>
        )}
      </div>

      {/* Batter & Bowler Live Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batting Box */}
        <div className="bg-sleek-card border border-sleek-border rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex text-[9px] font-black text-sleek-accent uppercase tracking-wider border-b border-sleek-border pb-2 mb-3">
              <div className="flex-1">BATTERS</div>
              <div className="w-6 text-center">R</div>
              <div className="w-6 text-center">B</div>
              <div className="w-6 text-center">4s</div>
              <div className="w-6 text-center">6s</div>
              <div className="w-10 text-right">SR</div>
            </div>
            <div className="space-y-3">
              {/* Batter 1 (Striker) */}
              <div className="flex items-center text-sm">
                <div className="flex-1 flex items-center gap-1.5 min-w-0 pr-2">
                  <span className="font-extrabold text-sleek-text truncate text-xs">{getShorterName(strikerId)}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)] shrink-0"></div>
                </div>
                <div className="w-6 text-center font-black text-sleek-text font-mono">{strikerStats.runs}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted font-mono text-xs">{strikerStats.balls}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted font-mono text-xs">{strikerStats.fours}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted font-mono text-xs">{strikerStats.sixes}</div>
                <div className="w-10 text-right font-medium text-sleek-text-muted font-mono text-xs">
                  {strikerStats.balls > 0 ? ((strikerStats.runs / strikerStats.balls) * 100).toFixed(1) : '0.0'}
                </div>
              </div>
              {/* Batter 2 (Non-Striker) */}
              <div className="flex items-center text-sm">
                <div className="flex-1 flex items-center gap-1.5 min-w-0 pr-2">
                  <span className="font-semibold text-sleek-text-muted truncate text-xs">{getShorterName(nonStrikerId)}</span>
                </div>
                <div className="w-6 text-center font-extrabold text-sleek-text-muted font-mono">{nonStrikerStats.runs}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted/60 font-mono text-xs">{nonStrikerStats.balls}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted/60 font-mono text-xs">{nonStrikerStats.fours}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted/60 font-mono text-xs">{nonStrikerStats.sixes}</div>
                <div className="w-10 text-right font-medium text-sleek-text-muted/60 font-mono text-xs">
                  {nonStrikerStats.balls > 0 ? ((nonStrikerStats.runs / nonStrikerStats.balls) * 100).toFixed(1) : '0.0'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between border-t border-sleek-border pt-3 mt-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-sleek-text-muted block uppercase tracking-wider font-sans mb-0.5">Partnership</span>
              <span className="font-black text-sleek-text">{partnership.runs}</span> <span className="text-sleek-text-muted">({partnership.balls})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-sleek-text-muted block uppercase tracking-wider font-sans mb-0.5">Run Rate</span>
              <span className="font-black text-sleek-text">{parseFloat((battingScore.runs / ((currentOversCompleted * 6 + currentOverBalls) / 6 || 1)).toFixed(2))}</span>
            </div>
          </div>
        </div>

        {/* Bowling Box */}
        <div className="bg-sleek-card border border-sleek-border rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex text-[9px] font-black text-sleek-accent uppercase tracking-wider border-b border-sleek-border pb-2 mb-3">
              <div className="flex-1">BOWLER</div>
              <div className="w-6 text-center">O</div>
              <div className="w-6 text-center">M</div>
              <div className="w-6 text-center">R</div>
              <div className="w-6 text-center">W</div>
            </div>
            {currentBowlerId ? (
              <div className="flex items-center text-sm">
                <div className="flex-1 flex items-center gap-1.5 min-w-0 pr-2">
                  <span className="font-extrabold text-sleek-text truncate text-xs">{getShorterName(currentBowlerId)}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)] shrink-0"></div>
                </div>
                <div className="w-6 text-center font-medium text-sleek-text-muted font-mono text-xs">{activeBowlerStats.overs}.{activeBowlerStats.balls % 6}</div>
                <div className="w-6 text-center font-medium text-sleek-text-muted font-mono text-xs">{activeBowlerStats.maidens}</div>
                <div className="w-6 text-center font-extrabold text-sleek-text font-mono">{activeBowlerStats.runs}</div>
                <div className="w-6 text-center font-black text-rose-400 font-mono">{activeBowlerStats.wickets}</div>
              </div>
            ) : (
              <button
                onClick={() => setShowBowlerModal(true)}
                className="w-full py-1.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-accent text-[10px] font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Play size={10} /> Select Bowler for New Over
              </button>
            )}
            {/* Bowler Quota Badge */}
            {currentBowlerId && (() => {
              const maxOvers = match.overs <= 8 ? 2 : null;
              if (!maxOvers) return null;
              const bowledOvers = Math.floor(activeBowlerStats.balls / 6);
              const remaining = maxOvers - bowledOvers;
              return (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-sleek-text-muted uppercase tracking-widest font-bold">Quota</span>
                  <div className="flex gap-1 items-center">
                    {Array.from({ length: maxOvers }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-1.5 rounded-full transition-all ${
                          i < bowledOvers ? 'bg-rose-500' : 'bg-sleek-overlay border border-sleek-border'
                        }`}
                      />
                    ))}
                    <span className={`text-[9px] font-black ml-1 ${
                      remaining === 0 ? 'text-rose-400' : remaining === 1 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {remaining > 0 ? `${remaining} left` : 'DONE'}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="mt-3">
              <span className="text-[9px] font-black text-sleek-text-muted uppercase tracking-widest block mb-2">This Over</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                {thisOverEvents.map((ev: any, idx: number) => {
                  let text = `${ev.runs}`;
                  let bg = 'bg-sleek-overlay border-sleek-border';
                  let textColor = 'text-sleek-text';

                  if (ev.isWicket) { text = 'W'; bg = 'bg-rose-500/20 border-rose-500/40'; textColor = 'text-rose-400'; }
                  else if (ev.extraType === 'wide') { text = `Wd`; bg = 'bg-purple-500/10 border-purple-500/30'; textColor = 'text-purple-400'; }
                  else if (ev.extraType === 'noBall') { text = `${ev.runs > 0 ? ev.runs : ''}Nb`; bg = 'bg-pink-500/10 border-pink-500/30'; textColor = 'text-pink-400'; }
                  else if (ev.runs === 4) { bg = 'bg-emerald-500/20 border-emerald-500/40'; textColor = 'text-emerald-400'; }
                  else if (ev.runs === 6) { bg = 'bg-amber-500/20 border-amber-500/40'; textColor = 'text-amber-400'; }
                  else if (ev.runs === 0) { text = '•'; textColor = 'text-sleek-text-muted'; }

                  return (
                    <div key={idx} className={`w-8 h-8 rounded-full ${bg} border flex items-center justify-center font-mono font-black text-xs shrink-0 ${textColor}`}>
                      {text}
                    </div>
                  );
                })}
                {thisOverEvents.length === 0 && (
                  <div className="text-xs text-sleek-text-muted italic">Over just started</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between border-t border-sleek-border pt-3 mt-3 text-xs font-mono">
            <div className="flex-1">
              <span className="text-[10px] text-sleek-text-muted block uppercase tracking-wider font-sans mb-1">Over Progress</span>
              {/* 6-dot over progress bar */}
              <div className="flex gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => {
                  const legitimateBalls = thisOverEvents.filter((e: any) => e.extraType !== 'wide' && e.extraType !== 'noBall').length;
                  const filled = i < legitimateBalls;
                  return (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        filled ? 'bg-sleek-accent border-sleek-accent' : 'bg-sleek-overlay border-sleek-border'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <span className="text-[9px] text-sleek-text-muted block uppercase tracking-wider font-sans">Runs</span>
                <span className="font-black text-sleek-text">{thisOverRuns}</span>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-sleek-text-muted block uppercase tracking-wider font-sans">Wkts</span>
                <span className="font-black text-sleek-text">{thisOverWickets}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
