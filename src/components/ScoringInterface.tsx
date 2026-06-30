import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Match, Player, PlayerStats } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { AlertTriangle, Award, Check, Users, RefreshCw, LayoutList, XOctagon, Loader2, UserCheck, Sparkles } from 'lucide-react';
import { useMatchScoring } from '../hooks/useMatchScoring';
import { ScorecardDisplay } from './ScorecardDisplay';
import { ScoringControls } from './ScoringControls';
import { WicketModal } from './WicketModal';
import { InningsStartModal } from './InningsStartModal';
import { FullScorecardModal } from './FullScorecardModal';
import { ManageTeamsModal } from './ManageTeamsModal';

interface ScoringInterfaceProps {
  match: Match;
  players: Player[];
  onRefresh: () => void;
  onClose?: () => void;
  onMatchComplete?: (matchId: string) => void;
}

// ──────────────────────────────────────────────────
// Simple Toast Component
// ──────────────────────────────────────────────────
type ToastType = 'info' | 'success' | 'warning' | 'error';
interface ToastState { message: string; type: ToastType; }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const colors: Record<ToastType, string> = {
    success: 'bg-emerald-500 text-black border-emerald-400',
    warning: 'bg-amber-500 text-black border-amber-400',
    error: 'bg-rose-600 text-white border-rose-400',
    info: 'bg-sleek-panel text-sleek-text border-sleek-accent',
  };
  return (
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-sleek-2xl border font-bold text-sm max-w-xs w-full text-center cursor-pointer ${colors[toast.type]}`}
      onClick={onDismiss}
    >
      {toast.message}
    </div>
  );
}

export default function ScoringInterface({ match, players, onRefresh, onClose, onMatchComplete }: ScoringInterfaceProps) {
  // ── Wicket state ──
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<'bowled' | 'caught' | 'runout' | 'stumped' | 'lbw' | 'hit_wicket'>('bowled');
  const [wicketBatterId, setWicketBatterId] = useState<string>('');
  const [fielderName, setFielderName] = useState('');
  const [isNoBallWicket, setIsNoBallWicket] = useState(false); // true = wicket on a no ball

  // ── Incoming batter state ──
  const [showIncomingBatterModal, setShowIncomingBatterModal] = useState(false);
  const [emptyBatterSlot, setEmptyBatterSlot] = useState<1 | 2 | null>(null); // 1=striker out, 2=non-striker out
  const [savingBatter, setSavingBatter] = useState(false);

  // ── Bowler state ──
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [nextBowlerId, setNextBowlerId] = useState('');

  // ── Awards state ──
  const [showAwardsPanel, setShowAwardsPanel] = useState(false);
  const [potmId, setPotmId] = useState('');
  const [bestBatterId, setBestBatterId] = useState('');
  const [bestBowlerId, setBestBowlerId] = useState('');
  const [mvpId, setMvpId] = useState('');
  const [suggestedMVPId, setSuggestedMVPId] = useState<string | null>(null);
  const [declaringAwards, setDeclaringAwards] = useState(false);

  useEffect(() => {
    if (showAwardsPanel) {
      const allBatting = [...match.scores.teamA.batting, ...match.scores.teamB.batting];
      const allBowling = [...match.scores.teamA.bowling, ...match.scores.teamB.bowling];
      const uniqueIds = [...new Set([
        ...allBatting.map(b => b.playerId),
        ...allBowling.map(b => b.playerId),
      ])];
      let bestScore = -1;
      let bestPlayerId = null;

      for (const playerId of uniqueIds) {
        const batRuns = allBatting.filter(b => b.playerId === playerId).reduce((s, b) => s + b.runs, 0);
        const bowlWickets = allBowling.filter(b => b.playerId === playerId).reduce((s, b) => s + b.wickets, 0);
        const score = (batRuns * 1) + (bowlWickets * 20);
        if (score > bestScore) {
          bestScore = score;
          bestPlayerId = playerId;
        }
      }
      setSuggestedMVPId(bestPlayerId);
    }
  }, [showAwardsPanel, match.scores]);

  // ── Other UI state ──
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [showFullScorecard, setShowFullScorecard] = useState(false);
  const [showManageTeams, setShowManageTeams] = useState(false);

  // ── Toast ──
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const scoringData = useMatchScoring({
    match,
    players,
    onRefresh,
    setShowBowlerModal,
    setShowAwardsPanel,
    onToast: showToast,
  });

  // ──────────────────────────────────────────────────
  // Wicket Submission
  // ──────────────────────────────────────────────────
  const handleWicketSubmitted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wicketBatterId) return;
    setShowWicketModal(false);

    const wicketPayload: any = { playerId: wicketBatterId, wicketType };
    if (fielderName.trim()) wicketPayload.fielderName = fielderName.trim();

    // Determine which slot will be vacated
    if (wicketBatterId === scoringData.strikerId) {
      setEmptyBatterSlot(1);
    } else {
      setEmptyBatterSlot(2);
    }

    if (isNoBallWicket) {
      // NB + Run Out: extra ball, no extra run, wicket on no ball
      scoringData.processBall(0, true, 'noBall', wicketPayload);
    } else {
      scoringData.processBall(0, false, null, wicketPayload);
    }

    setFielderName('');
    setIsNoBallWicket(false);
    setShowIncomingBatterModal(true);
  };

  // ──────────────────────────────────────────────────
  // Incoming Batter After Wicket
  // ──────────────────────────────────────────────────
  const handleIncomingBatterConfirm = async (newBatterId: string) => {
    setSavingBatter(true);
    const matchRef = doc(db, 'matches', match.id);
    try {
      if (emptyBatterSlot === 1) {
        await updateDoc(matchRef, { currentBatter1Id: newBatterId, updatedAt: new Date().toISOString() });
      } else {
        await updateDoc(matchRef, { currentBatter2Id: newBatterId, updatedAt: new Date().toISOString() });
      }
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    } finally {
      setSavingBatter(false);
      setShowIncomingBatterModal(false);
      setEmptyBatterSlot(null);
    }
  };

  // ──────────────────────────────────────────────────
  // Bowler Selection
  // ──────────────────────────────────────────────────
  const submitBowler = async (bowlerId: string) => {
    if (!bowlerId) return;
    setShowBowlerModal(false);
    const matchRef = doc(db, 'matches', match.id);
    try {
      await updateDoc(matchRef, { currentBowlerId: bowlerId, updatedAt: new Date().toISOString() });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleBowlerSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    submitBowler(nextBowlerId);
  };

  // ──────────────────────────────────────────────────
  // Player Stats Update on Match Completion
  // ──────────────────────────────────────────────────
  const updatePlayerStats = async (potm: string, bestBat: string, bestBowl: string, mvp: string) => {
    const allBatting = [...match.scores.teamA.batting, ...match.scores.teamB.batting];
    const allBowling = [...match.scores.teamA.bowling, ...match.scores.teamB.bowling];

    const uniqueIds = [...new Set([
      ...allBatting.map(b => b.playerId),
      ...allBowling.map(b => b.playerId),
    ])];

    for (const playerId of uniqueIds) {
      const battingEntries = allBatting.filter(b => b.playerId === playerId);
      const bowlingEntries = allBowling.filter(b => b.playerId === playerId);

      const batRuns = battingEntries.reduce((s, b) => s + b.runs, 0);
      const batBalls = battingEntries.reduce((s, b) => s + b.balls, 0);
      const batFours = battingEntries.reduce((s, b) => s + b.fours, 0);
      const batSixes = battingEntries.reduce((s, b) => s + b.sixes, 0);
      const batDismissed = battingEntries.some(b => b.dismissed);

      const bowlBalls = bowlingEntries.reduce((s, b) => s + b.balls, 0);
      const bowlRuns = bowlingEntries.reduce((s, b) => s + b.runs, 0);
      const bowlWickets = bowlingEntries.reduce((s, b) => s + b.wickets, 0);

      if (batBalls === 0 && bowlBalls === 0) continue;

      const statsRef = doc(db, 'player_stats', playerId);
      const snap = await getDoc(statsRef);
      const base: PlayerStats = snap.exists() ? (snap.data() as PlayerStats) : {
        id: playerId,
        name: players.find(p => p.id === playerId)?.name || 'Unknown',
        matchesPlayed: 0,
        batting: { innings: 0, runs: 0, highestScore: 0, average: 0, strikeRate: 0, thirtyPlus: 0, fiftyPlus: 0, ballsFaced: 0, dismissals: 0 },
        bowling: { innings: 0, wickets: 0, runsConceded: 0, oversBowled: 0, economy: 0, average: 0, bestWickets: 0, bestRuns: 999 },
        fielding: { catches: 0, runOuts: 0, stumpings: 0 },
        awards: { potm: 0, bestBatter: 0, bestBowler: 0, mvp: 0, mvpPoints: 0 },
      };

      const newBatRuns = base.batting.runs + batRuns;
      const newBatBalls = base.batting.ballsFaced + batBalls;
      const newBatInnings = base.batting.innings + (batBalls > 0 ? 1 : 0);
      const newBatDismissals = base.batting.dismissals + (batDismissed ? 1 : 0);
      const newHighScore = Math.max(base.batting.highestScore, batRuns);

      const existingBowlBalls = Math.round(base.bowling.oversBowled * 6);
      const newTotalBowlBalls = existingBowlBalls + bowlBalls;
      const newBowlRuns = base.bowling.runsConceded + bowlRuns;
      const newBowlWickets = base.bowling.wickets + bowlWickets;
      const newBowlInnings = base.bowling.innings + (bowlBalls > 0 ? 1 : 0);

      // Best bowling figures
      let newBestWickets = base.bowling.bestWickets;
      let newBestRuns = base.bowling.bestRuns === 999 ? 0 : base.bowling.bestRuns;
      if (bowlWickets > newBestWickets || (bowlWickets === newBestWickets && bowlRuns < newBestRuns)) {
        newBestWickets = bowlWickets;
        newBestRuns = bowlRuns;
      }

      const isPOTM = potm === playerId;
      const isBestBat = bestBat === playerId;
      const isBestBowl = bestBowl === playerId;
      const isMVP = mvp === playerId;

      const mvpPoints = base.awards.mvpPoints
        + (isPOTM ? 5 : 0)
        + (isBestBat ? 3 : 0)
        + (isBestBowl ? 3 : 0)
        + (isMVP ? 10 : 0)
        + Math.floor(batRuns / 10)
        + bowlWickets * 2;

      const updated = {
        id: playerId,
        name: players.find(p => p.id === playerId)?.name || base.name,
        matchesPlayed: base.matchesPlayed + 1,
        batting: {
          innings: newBatInnings,
          runs: newBatRuns,
          highestScore: newHighScore,
          average: newBatDismissals > 0 ? parseFloat((newBatRuns / newBatDismissals).toFixed(2)) : newBatRuns,
          strikeRate: newBatBalls > 0 ? parseFloat(((newBatRuns / newBatBalls) * 100).toFixed(1)) : 0,
          thirtyPlus: base.batting.thirtyPlus + (batRuns >= 30 ? 1 : 0),
          fiftyPlus: base.batting.fiftyPlus + (batRuns >= 50 ? 1 : 0),
          ballsFaced: newBatBalls,
          dismissals: newBatDismissals,
        },
        bowling: {
          innings: newBowlInnings,
          wickets: newBowlWickets,
          runsConceded: newBowlRuns,
          oversBowled: newTotalBowlBalls / 6,
          economy: newTotalBowlBalls > 0 ? parseFloat((newBowlRuns / (newTotalBowlBalls / 6)).toFixed(2)) : 0,
          average: newBowlWickets > 0 ? parseFloat((newBowlRuns / newBowlWickets).toFixed(2)) : 0,
          bestWickets: newBestWickets,
          bestRuns: newBestRuns,
        },
        fielding: base.fielding || { catches: 0, runOuts: 0, stumpings: 0 },
        awards: {
          potm: base.awards.potm + (isPOTM ? 1 : 0),
          bestBatter: base.awards.bestBatter + (isBestBat ? 1 : 0),
          bestBowler: base.awards.bestBowler + (isBestBowl ? 1 : 0),
          mvp: base.awards.mvp + (isMVP ? 1 : 0),
          mvpPoints,
        },
        createdAt: (snap.data() as any)?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(statsRef, updated);
    }
  };

  // ──────────────────────────────────────────────────
  // Declare Awards & Save Stats
  // ──────────────────────────────────────────────────
  const handleDeclareAwards = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeclaringAwards(true);
    const matchRef = doc(db, 'matches', match.id);

    const scoreA = match.scores.teamA.runs;
    const scoreB = match.scores.teamB.runs;
    let winner: string | null = 'draw';
    if (scoreA > scoreB) winner = 'teamA';
    if (scoreB > scoreA) winner = 'teamB';

    try {
      await updateDoc(matchRef, {
        status: 'completed',
        winner,
        playerOfTheMatch: potmId || null,
        bestBatter: bestBatterId || null,
        bestBowler: bestBowlerId || null,
        mvp: mvpId || null,
        updatedAt: new Date().toISOString()
      });

      // Update career stats for all participating players
      await updatePlayerStats(potmId, bestBatterId, bestBowlerId, mvpId);

      setShowAwardsPanel(false);
      showToast(`Match complete! 🏆 ${winner === 'draw' ? 'It\'s a draw!' : `${winner === 'teamA' ? match.teamA.name : match.teamB.name} wins!`}`, 'success');
      onRefresh();
      if (onMatchComplete) {
        onMatchComplete(match.id);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    } finally {
      setDeclaringAwards(false);
    }
  };

  const handleAbortMatch = async () => {
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        status: 'aborted',
        updatedAt: new Date().toISOString()
      });
      setShowAbortConfirm(false);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleInningsStart = async (strikerId: string, nonStrikerId: string, bowlerId: string) => {
    const matchRef = doc(db, 'matches', match.id);
    try {
      await updateDoc(matchRef, {
        currentBatter1Id: strikerId,
        currentBatter2Id: nonStrikerId,
        currentBowlerId: bowlerId,
        updatedAt: new Date().toISOString()
      });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const needsInningsStart = !match.currentBatter1Id || !match.currentBatter2Id;
  const previousBowlerId = match.timeline.length > 0 ? match.timeline[match.timeline.length - 1].bowlerId : null;

  // Auto-select bowler if only one eligible bowler remains
  useEffect(() => {
    if (showBowlerModal) {
      const maxOvers = match.overs <= 8 ? 2 : null;
      const eligible = scoringData.bowlingTeam.players.filter(id => {
        if (id === previousBowlerId) return false;
        if (!maxOvers) return true;
        const b = scoringData.bowlingScore.bowling.find(x => x.playerId === id);
        const balls = b ? b.balls : 0;
        return balls / 6 < maxOvers;
      });
      if (eligible.length === 1) submitBowler(eligible[0]);
    }
  }, [showBowlerModal, match.overs, previousBowlerId]);

  // Force bowler modal if match is active, innings is started, but bowler is null
  useEffect(() => {
    if (!match.currentBowlerId && !needsInningsStart && match.status === 'scoring') {
      setShowBowlerModal(true);
    }
  }, [match.currentBowlerId, needsInningsStart, match.status]);

  // Hide incoming batter modal if innings transition occurred (InningsStartModal will take over)
  useEffect(() => {
    if (needsInningsStart) {
      setShowIncomingBatterModal(false);
      setEmptyBatterSlot(null);
    }
  }, [needsInningsStart]);

  const handleSwapBatters = async () => {
    const matchRef = doc(db, 'matches', match.id);
    try {
      await updateDoc(matchRef, {
        currentBatter1Id: match.currentBatter2Id,
        currentBatter2Id: match.currentBatter1Id,
        updatedAt: new Date().toISOString()
      });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  // Dismissed + currently batting player IDs (to exclude from incoming batter list)
  const dismissedIds = new Set([
    ...match.scores.teamA.batting.filter(b => b.dismissed).map(b => b.playerId),
    ...match.scores.teamB.batting.filter(b => b.dismissed).map(b => b.playerId),
  ]);
  const currentBattingIds = new Set([match.currentBatter1Id, match.currentBatter2Id].filter(Boolean));
  const availableIncomingBatters = scoringData.battingTeam.players.filter(
    id => !dismissedIds.has(id) && !currentBattingIds.has(id)
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-155px)] md:h-auto gap-4 relative">
      {/* Absolute Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-3 -right-2 z-10 w-8 h-8 flex items-center justify-center bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text-muted hover:text-sleek-text rounded-full shadow-md transition cursor-pointer"
          title="Close Scoring"
        >
          <XOctagon size={14} className="opacity-0 absolute" /> {/* Fallback icon preloader */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}

      {/* Toast Notification */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Scrollable upper section for scorecards */}
      <div className="flex-1 overflow-y-auto pr-1">
        <ScorecardDisplay
          match={match}
          battingTeam={scoringData.battingTeam}
          bowlingTeam={scoringData.bowlingTeam}
          battingScore={scoringData.battingScore}
          bowlingScore={scoringData.bowlingScore}
          strikerId={scoringData.strikerId}
          nonStrikerId={scoringData.nonStrikerId}
          currentBowlerId={scoringData.currentBowlerId!}
          strikerStats={scoringData.strikerStats}
          nonStrikerStats={scoringData.nonStrikerStats}
          activeBowlerStats={scoringData.activeBowlerStats}
          partnership={scoringData.partnership}
          currentOversCompleted={scoringData.currentOversCompleted}
          currentOverBalls={scoringData.currentOverBalls}
          getShorterName={scoringData.getShorterName}
          setShowBowlerModal={setShowBowlerModal}
        />
      </div>

      {/* Pinned Bottom Scoring Controls */}
      <div className="shrink-0 space-y-3">
        <ScoringControls
          currentBowlerId={scoringData.currentBowlerId!}
          processBall={scoringData.processBall}
          onWicketClick={() => {
            setIsNoBallWicket(false);
            setWicketBatterId(scoringData.strikerId);
            setWicketType('bowled');
            setShowWicketModal(true);
          }}
          onNoBallRunOut={() => {
            setIsNoBallWicket(true);
            setWicketType('runout');
            setWicketBatterId(scoringData.strikerId);
            setShowWicketModal(true);
          }}
          undoLastBall={scoringData.undoLastBall}
          hasPreviousState={!!match.previousState}
        />

        {/* Action Bar */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setShowManageTeams(true)}
            className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <Users size={14} />
            Manage Teams
          </button>
          <button
            onClick={handleSwapBatters}
            className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text-muted text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <RefreshCw size={14} />
            Swap Batters
          </button>
          <button
            onClick={() => setShowFullScorecard(true)}
            className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text-muted text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <LayoutList size={14} />
            Scorecard
          </button>
          <button
            onClick={() => setShowAbortConfirm(true)}
            className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <XOctagon size={14} />
            End Match
          </button>
        </div>
      </div>

      {/* ── Modal: Bowler Selection ── */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleBowlerSelected} className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-sleek-2xl">
            <h4 className="font-extrabold text-sleek-accent text-base uppercase tracking-wider">Select Bowler for Next Over</h4>
            <div className="space-y-2">
              <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest">Available Bowlers</label>
              <select
                value={nextBowlerId}
                onChange={(e) => setNextBowlerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-sm text-sleek-text focus:ring-1 focus:ring-sleek-accent"
              >
                <option value="">Choose bowler...</option>
                {scoringData.bowlingTeam.players.map((id: string) => {
                  const maxOvers = match.overs <= 8 ? 2 : null;
                  const b = scoringData.bowlingScore.bowling.find(x => x.playerId === id);
                  const balls = b ? b.balls : 0;
                  const completedOvers = Math.floor(balls / 6);
                  const oversDisplay = `${completedOvers}.${balls % 6}`;
                  if (maxOvers && completedOvers >= maxOvers) return null;
                  return (
                    <option key={id} value={id} disabled={id === previousBowlerId}>
                      {scoringData.getPlayerName(id)}{' '}
                      {id === previousBowlerId ? '(Bowled Last Over)' : (maxOvers ? `[${oversDisplay}/${maxOvers} overs]` : '')}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-sleek-accent text-black text-xs font-black uppercase tracking-wider rounded-xl hover:bg-sleek-accent/80 transition"
            >
              Confirm Bowler
            </button>
          </form>
        </div>
      )}

      {/* ── Modal: Wicket ── */}
      {showWicketModal && (
        <WicketModal
          strikerId={scoringData.strikerId}
          nonStrikerId={scoringData.nonStrikerId}
          wicketBatterId={wicketBatterId}
          setWicketBatterId={setWicketBatterId}
          wicketType={wicketType}
          setWicketType={setWicketType}
          fielderName={fielderName}
          setFielderName={setFielderName}
          getPlayerName={scoringData.getPlayerName}
          fieldingTeamPlayers={scoringData.bowlingTeam.players}
          onCancel={() => { setShowWicketModal(false); setIsNoBallWicket(false); }}
          onSubmit={handleWicketSubmitted}
        />
      )}

      {/* ── Modal: Incoming Batter After Wicket ── */}
      {showIncomingBatterModal && !needsInningsStart && (
        <div className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-sleek-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
                <UserCheck size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-sleek-text text-sm uppercase tracking-wider">Select Incoming Batter</h4>
                <p className="text-[10px] text-sleek-text-muted mt-0.5">
                  {emptyBatterSlot === 1 ? 'Striker' : 'Non-Striker'} slot is now vacant
                </p>
              </div>
            </div>

            {availableIncomingBatters.length === 0 ? (
              <p className="text-xs text-sleek-text-muted text-center py-4">All batters have been dismissed.</p>
            ) : (
              <div className="space-y-2">
                {availableIncomingBatters.map(id => (
                  <button
                    key={id}
                    disabled={savingBatter}
                    onClick={() => handleIncomingBatterConfirm(id)}
                    className="w-full py-3 px-4 bg-sleek-overlay hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-sleek-border text-sleek-text text-sm font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingBatter ? <Loader2 size={14} className="animate-spin" /> : null}
                    {scoringData.getPlayerName(id)}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { setShowIncomingBatterModal(false); setEmptyBatterSlot(null); }}
              className="w-full py-2 text-xs text-sleek-text-muted hover:text-sleek-text font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Skip (select manually via Swap Batters)
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Manage Teams ── */}
      {showManageTeams && (
        <ManageTeamsModal
          match={match}
          players={players}
          onClose={() => setShowManageTeams(false)}
          onRefresh={onRefresh}
        />
      )}

      {/* ── Modal: Awards Declaration ── */}
      {showAwardsPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleDeclareAwards} className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-sleek-2xl overflow-y-auto max-h-[90vh]">
            <h4 className="font-extrabold text-sleek-accent text-base uppercase tracking-wider flex items-center gap-2">
              <Award className="text-sleek-accent" /> Declare Match Awards
            </h4>
            
            {suggestedMVPId && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2">
                <Sparkles className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-emerald-100">
                  <span className="font-bold text-emerald-400">Suggested Player:</span> {scoringData.getPlayerName(suggestedMVPId)}
                  <div className="text-[10px] text-emerald-500/80 mt-0.5">Based on overall runs and wickets across the match.</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* POTM */}
              <div>
                <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block mb-1">Player of the Match (POTM)</label>
                <select value={potmId} onChange={(e) => setPotmId(e.target.value)}
                  className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-xs text-sleek-text focus:ring-1 focus:ring-sleek-accent font-semibold">
                  <option value="">Select player...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{scoringData.getPlayerName(id)}</option>
                  ))}
                </select>
              </div>

              {/* Best Batter */}
              <div>
                <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block mb-1">Best Batter 🏏</label>
                <select value={bestBatterId} onChange={(e) => setBestBatterId(e.target.value)}
                  className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-xs text-sleek-text focus:ring-1 focus:ring-sleek-accent font-semibold">
                  <option value="">Select batter...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{scoringData.getPlayerName(id)}</option>
                  ))}
                </select>
              </div>

              {/* Best Bowler */}
              <div>
                <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block mb-1">Best Bowler 🎯</label>
                <select value={bestBowlerId} onChange={(e) => setBestBowlerId(e.target.value)}
                  className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-xs text-sleek-text focus:ring-1 focus:ring-sleek-accent font-semibold">
                  <option value="">Select bowler...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{scoringData.getPlayerName(id)}</option>
                  ))}
                </select>
              </div>

              {/* MVP */}
              <div>
                <label className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block mb-1">Most Valuable Player (MVP) ⭐</label>
                <select value={mvpId} onChange={(e) => setMvpId(e.target.value)}
                  className="w-full px-3 py-2 bg-sleek-overlay border border-sleek-border rounded-xl focus:outline-none text-xs text-sleek-text focus:ring-1 focus:ring-sleek-accent font-semibold">
                  <option value="">Select MVP...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{scoringData.getPlayerName(id)}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={declaringAwards}
              className="w-full py-3 bg-sleek-accent text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-sleek-accent/80 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {declaringAwards ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {declaringAwards ? 'Saving Stats...' : 'Finish Match & Declare Awards'}
            </button>
          </form>
        </div>
      )}

      {/* ── Modal: Abort Confirmation ── */}
      {showAbortConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-sleek-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-2">
              <h4 className="font-extrabold text-sleek-text text-base uppercase tracking-wider">Abort Active Match?</h4>
              <p className="text-xs text-sleek-text-muted leading-relaxed">
                Are you sure? This match will be archived. You can resume or delete it later.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button type="button" onClick={() => setShowAbortConfirm(false)}
                className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleAbortMatch}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer">
                Abort Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Innings Start Modal ── */}
      {needsInningsStart && (
        <InningsStartModal
          match={match}
          battingTeam={scoringData.battingTeam}
          bowlingTeam={scoringData.bowlingTeam}
          getPlayerName={scoringData.getPlayerName}
          onConfirm={handleInningsStart}
          innings={match.currentInnings}
        />
      )}

      {/* ── Full Scorecard Modal ── */}
      {showFullScorecard && (
        <FullScorecardModal
          match={match}
          players={players}
          onClose={() => setShowFullScorecard(false)}
        />
      )}
    </div>
  );
}
