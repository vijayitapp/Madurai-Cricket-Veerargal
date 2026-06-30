import React from 'react';

interface ScoringControlsProps {
  currentBowlerId: string | null;
  processBall: (runs: number, isExtra: boolean, extraType: 'wide' | 'noBall' | 'bye' | 'legBye' | null, wicket?: any) => void;
  onWicketClick: () => void;
  onNoBallRunOut: () => void;
  undoLastBall: () => void;
  hasPreviousState: boolean;
}

export function ScoringControls({ currentBowlerId, processBall, onWicketClick, onNoBallRunOut, undoLastBall, hasPreviousState }: ScoringControlsProps) {
  const [showNoBallModal, setShowNoBallModal] = React.useState(false);

  return (
    <div className="bg-sleek-panel border border-sleek-border p-4 rounded-3xl space-y-3">
      {/* Run Buttons — 6 col grid */}
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 6].map(r => {
          let textColor = 'text-sleek-text';
          let bg = 'bg-sleek-overlay hover:bg-sleek-overlay-hover';
          if (r === 4) { textColor = 'text-emerald-400'; bg = 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'; }
          if (r === 6) { textColor = 'text-amber-400'; bg = 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'; }

          return (
            <button
              key={r}
              onClick={() => processBall(r, false, null)}
              disabled={!currentBowlerId}
              className={`py-4 ${bg} border border-sleek-border font-mono font-black ${textColor} text-xl rounded-2xl shadow-sm transition flex items-center justify-center cursor-pointer disabled:opacity-30`}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Extras & Special Buttons — 3 col */}
      <div className="grid grid-cols-3 gap-2">
        {/* Wicket */}
        <button
          onClick={onWicketClick}
          disabled={!currentBowlerId}
          className="py-3 bg-rose-500/10 border border-rose-500/30 text-sm font-black uppercase tracking-wider text-rose-400 hover:bg-rose-500/20 rounded-xl transition cursor-pointer disabled:opacity-30"
        >
          OUT
        </button>

        {/* Wide — simply +1 extra, no bye follow-up */}
        <button
          onClick={() => processBall(0, true, 'wide')}
          disabled={!currentBowlerId}
          className="py-3 bg-purple-500/10 border border-purple-500/30 text-sm font-black uppercase tracking-wider text-purple-400 hover:bg-purple-500/20 rounded-xl transition cursor-pointer disabled:opacity-30"
        >
          WIDE
        </button>

        {/* No Ball */}
        <button
          onClick={() => setShowNoBallModal(true)}
          disabled={!currentBowlerId}
          className="py-3 bg-pink-500/10 border border-pink-500/30 text-sm font-black uppercase tracking-wider text-pink-400 hover:bg-pink-500/20 rounded-xl transition cursor-pointer disabled:opacity-30"
        >
          NO BALL
        </button>
      </div>

      {/* Undo */}
      <div className="pt-1 border-t border-sleek-border">
        <button
          onClick={undoLastBall}
          disabled={!hasPreviousState}
          className="w-full py-2.5 bg-amber-500/10 border border-amber-500/20 text-xs font-black uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 rounded-xl transition cursor-pointer disabled:opacity-30 flex justify-center items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          UNDO LAST BALL
        </button>
      </div>

      {/* No Ball Modal */}
      {showNoBallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-sleek-2xl text-center">
            <h4 className="font-extrabold text-sleek-accent text-base uppercase tracking-wider">No Ball</h4>
            <p className="text-xs text-sleek-text-muted">How many runs did the batter score off this No Ball?</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[0, 1, 2, 3, 4, 6].map(r => (
                <button
                  key={r}
                  onClick={() => {
                    processBall(r, true, 'noBall');
                    setShowNoBallModal(false);
                  }}
                  className="py-3 bg-sleek-overlay hover:bg-sleek-accent hover:text-black border border-sleek-border font-mono font-black text-sleek-text text-lg rounded-2xl transition cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Run Out on No Ball — opens proper WicketModal */}
            <div className="pt-2 border-t border-sleek-border">
              <button
                onClick={() => {
                  setShowNoBallModal(false);
                  onNoBallRunOut();
                }}
                className="w-full py-2.5 bg-rose-500/10 border border-rose-500/20 text-xs font-black uppercase tracking-wider text-rose-400 hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
              >
                Run Out + No Ball (select batter below)
              </button>
            </div>
            <button
              onClick={() => setShowNoBallModal(false)}
              className="w-full py-2 bg-transparent text-sleek-text-muted hover:text-sleek-text text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
