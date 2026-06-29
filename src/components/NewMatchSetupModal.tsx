import React, { useState, useEffect } from 'react';
import { Player, PlayerStats, Match } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { X, Trophy, Sparkles, AlertTriangle, Play, ArrowRight, RefreshCw, CheckCircle2, Circle, Users, Shield } from 'lucide-react';

interface NewMatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  playerStats: PlayerStats[];
  onMatchCreated: (matchId: string) => void;
}

type SetupStep = 'teams' | 'toss' | 'decision';

export default function NewMatchSetupModal({
  isOpen,
  onClose,
  players,
  playerStats,
  onMatchCreated
}: NewMatchSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('teams');

  // Step 1: Team Configuration State
  const [teamAName, setTeamAName] = useState<string>('RAMCO VEERARGAL');
  const [teamBName, setTeamBName] = useState<string>('HARD WORKERS');
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [doubleSidedId, setDoubleSidedId] = useState<string | null>(null);
  const [captainA, setCaptainA] = useState<string>('');
  const [captainB, setCaptainB] = useState<string>('');
  const [oversCount, setOversCount] = useState<number>(6);
  const [customOvers, setCustomOvers] = useState<string>('');

  // Step 2: Toss State
  const [tossCaller, setTossCaller] = useState<'teamA' | 'teamB' | null>(null);
  const [tossCall, setTossCall] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [tossCompleted, setTossCompleted] = useState<boolean>(false);
  const [tossResult, setTossResult] = useState<'heads' | 'tails' | null>(null);
  const [tossWinner, setTossWinner] = useState<'teamA' | 'teamB' | null>(null);

  // Step 3: Decision State
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Local copy of players for managing availability on the fly
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (isOpen) {
      setLocalPlayers(players);
      setStep('teams');
      resetToss();

      // Assign random team names
      const isRandom = Math.random() < 0.5;
      setTeamAName(isRandom ? 'RAMCO VEERARGAL' : 'HARD WORKERS');
      setTeamBName(isRandom ? 'HARD WORKERS' : 'RAMCO VEERARGAL');

      // Initialize team lists from currently available players
      const available = players.filter(p => p.available);
      
      // Auto-partition players to provide a smart default balance
      const statsMap = new Map<string, number>();
      playerStats.forEach(s => statsMap.set(s.id, s.awards.mvpPoints || 0));
      const sorted = [...available].sort((a, b) => (statsMap.get(b.id) || 0) - (statsMap.get(a.id) || 0));

      const listA: string[] = [];
      const listB: string[] = [];
      let dsId: string | null = null;

      const isOdd = sorted.length % 2 !== 0;
      const pool = [...sorted];
      if (isOdd && pool.length > 0) {
        const mid = Math.floor(pool.length / 2);
        const [ds] = pool.splice(mid, 1);
        dsId = ds.id;
      }

      pool.forEach((p, idx) => {
        if (idx % 2 === 0) {
          listA.push(p.id);
        } else {
          listB.push(p.id);
        }
      });

      setTeamAPlayers(listA);
      setTeamBPlayers(listB);
      setDoubleSidedId(dsId);

      // Default captains
      if (listA.length > 0) setCaptainA(listA[0]);
      if (listB.length > 0) setCaptainB(listB[0]);
    }
  }, [isOpen, players, playerStats]);

  const handleSelectDoubleSided = (id: string | null) => {
    setDoubleSidedId(id);
    if (id) {
      setTeamAPlayers(prev => prev.filter(p => p !== id));
      setTeamBPlayers(prev => prev.filter(p => p !== id));
      if (captainA === id) setCaptainA('');
      if (captainB === id) setCaptainB('');
    }
  };

  const suggestRandomDoubleSided = () => {
    const availableList = localPlayers.filter(p => p.available);
    if (availableList.length === 0) return;
    const randomPlayer = availableList[Math.floor(Math.random() * availableList.length)];
    handleSelectDoubleSided(randomPlayer.id);
  };

  const handleAutoBalanceTeams = () => {
    const available = localPlayers.filter(p => p.available);
    if (available.length < 2) return;

    // Sort by MVP points
    const statsMap = new Map<string, number>();
    playerStats.forEach(s => statsMap.set(s.id, s.awards.mvpPoints || 0));
    const sorted = [...available].sort((a, b) => (statsMap.get(b.id) || 0) - (statsMap.get(a.id) || 0));

    const listA: string[] = [];
    const listB: string[] = [];
    let dsId: string | null = null;

    const isOdd = sorted.length % 2 !== 0;
    const pool = [...sorted];
    if (isOdd && pool.length > 0) {
      const mid = Math.floor(pool.length / 2);
      const [ds] = pool.splice(mid, 1);
      dsId = ds.id;
    }

    pool.forEach((p, idx) => {
      if (idx % 2 === 0) {
        listA.push(p.id);
      } else {
        listB.push(p.id);
      }
    });

    setTeamAPlayers(listA);
    setTeamBPlayers(listB);
    setDoubleSidedId(dsId);

    // Default captains
    if (listA.length > 0) setCaptainA(listA[0]);
    if (listB.length > 0) setCaptainB(listB[0]);
  };

  // Synchronize Double-Sided Player based on total available players
  useEffect(() => {
    const availableList = localPlayers.filter(p => p.available);
    const availableCount = availableList.length;
    const isOdd = availableCount % 2 !== 0;

    if (!isOdd) {
      // Even number of available players: NO Double-Sided player should exist
      if (doubleSidedId !== null) {
        setDoubleSidedId(null);
      }
    } else {
      // Odd number of available players: EXACTLY one must be designated as Double-Sided
      const currentIsAvailable = availableList.some(p => p.id === doubleSidedId);
      if (!doubleSidedId || !currentIsAvailable) {
        // Find an available player who isn't already assigned or just pick first available
        const poolPlayers = availableList.filter(p => !teamAPlayers.includes(p.id) && !teamBPlayers.includes(p.id));
        if (poolPlayers.length > 0) {
          const firstPool = poolPlayers[0].id;
          handleSelectDoubleSided(firstPool);
        } else if (availableList.length > 0) {
          const firstAvail = availableList[0].id;
          handleSelectDoubleSided(firstAvail);
        }
      }
    }
  }, [localPlayers, doubleSidedId]);

  const resetToss = () => {
    setTossCaller(null);
    setTossCall(null);
    setIsFlipping(false);
    setTossCompleted(false);
    setTossResult(null);
    setTossWinner(null);
    setTossDecision(null);
  };

  const getPlayerName = (id: string) => localPlayers.find(p => p.id === id)?.name || 'Unknown';
  const getPlayerAvatar = (id: string) => localPlayers.find(p => p.id === id)?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`;

  const togglePlayerAvailability = async (playerId: string) => {
    const updated = localPlayers.map(p => {
      if (p.id === playerId) {
        const available = !p.available;
        // If they become unavailable, remove them from any selected teams
        if (!available) {
          setTeamAPlayers(prev => prev.filter(id => id !== playerId));
          setTeamBPlayers(prev => prev.filter(id => id !== playerId));
          if (doubleSidedId === playerId) setDoubleSidedId(null);
          if (captainA === playerId) setCaptainA('');
          if (captainB === playerId) setCaptainB('');
        }
        return { ...p, available };
      }
      return p;
    });
    setLocalPlayers(updated);

    // Persist player availability to db silently
    try {
      const player = localPlayers.find(p => p.id === playerId);
      if (player) {
        await updateDoc(doc(db, 'players', playerId), {
          available: !player.available,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to update player availability in background:', err);
    }
  };

  const moveToTeam = (playerId: string, targetTeam: 'A' | 'B' | 'pool') => {
    // Remove from existing teams
    setTeamAPlayers(prev => prev.filter(id => id !== playerId));
    setTeamBPlayers(prev => prev.filter(id => id !== playerId));
    if (doubleSidedId === playerId) setDoubleSidedId(null);

    if (targetTeam === 'A') {
      setTeamAPlayers(prev => [...prev, playerId]);
      if (!captainA) setCaptainA(playerId);
    } else if (targetTeam === 'B') {
      setTeamBPlayers(prev => [...prev, playerId]);
      if (!captainB) setCaptainB(playerId);
    }

    // Auto update captains if they were removed
    setTimeout(() => {
      setTeamAPlayers(a => {
        if (a.length > 0 && !a.includes(captainA)) setCaptainA(a[0]);
        return a;
      });
      setTeamBPlayers(b => {
        if (b.length > 0 && !b.includes(captainB)) setCaptainB(b[0]);
        return b;
      });
    }, 50);
  };

  const handleRandomizeNames = () => {
    const isRandom = Math.random() < 0.5;
    setTeamAName(isRandom ? 'RAMCO VEERARGAL' : 'HARD WORKERS');
    setTeamBName(isRandom ? 'HARD WORKERS' : 'RAMCO VEERARGAL');
  };

  // Toss Simulation
  const handleFlipCoin = () => {
    if (!tossCaller || !tossCall) {
      alert('Please select who calls the toss and their choice (Heads/Tails) first!');
      return;
    }
    setIsFlipping(true);
    setTossCompleted(false);

    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
      setTossResult(outcome);

      const callerWon = tossCall === outcome;
      if (callerWon) {
        setTossWinner(tossCaller);
      } else {
        setTossWinner(tossCaller === 'teamA' ? 'teamB' : 'teamA');
      }

      setIsFlipping(false);
      setTossCompleted(true);
    }, 1500);
  };

  // Validation Rules
  const activeOvers = oversCount === 0 ? parseInt(customOvers) || 5 : oversCount;
  const availableList = localPlayers.filter(p => p.available);
  const availableCount = availableList.length;
  const isOdd = availableCount % 2 !== 0;
  const expectedTeamSize = isOdd ? (availableCount - 1) / 2 : availableCount / 2;

  const isBalanced = teamAPlayers.length === expectedTeamSize && teamBPlayers.length === expectedTeamSize;
  const hasCaptains = captainA !== '' && captainB !== '';
  const teamAHasPlayers = teamAPlayers.length > 0;
  const teamBHasPlayers = teamBPlayers.length > 0;
  const stepTeamsValid = isBalanced && hasCaptains && teamAHasPlayers && teamBHasPlayers;

  // Final match submission
  const handleFinalizeMatch = async () => {
    if (!tossWinner || !tossDecision) {
      alert('Please complete the toss and decide to Bat or Bowl first!');
      return;
    }

    setSaving(true);
    const matchId = `match_${Date.now()}`;

    // Configure who bats first
    let battingFirst: 'teamA' | 'teamB' = 'teamA';
    if (tossWinner === 'teamA') {
      battingFirst = tossDecision === 'bat' ? 'teamA' : 'teamB';
    } else {
      battingFirst = tossDecision === 'bat' ? 'teamB' : 'teamA';
    }

    const generateEmptyScore = (playerIds: string[]) => {
      const battingList = playerIds.map(id => {
        const player = localPlayers.find(p => p.id === id);
        return {
          playerId: id,
          name: player?.name || 'Unknown',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissed: false,
          dismissalType: null
        };
      });

      if (doubleSidedId) {
        const dsPlayer = localPlayers.find(p => p.id === doubleSidedId);
        if (dsPlayer) {
          battingList.push({
            playerId: doubleSidedId,
            name: `${dsPlayer.name} (DS)`,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dismissed: false,
            dismissalType: null
          });
        }
      }

      const bowlingList = playerIds.map(id => {
        const player = localPlayers.find(p => p.id === id);
        return {
          playerId: id,
          name: player?.name || 'Unknown',
          overs: 0,
          balls: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
          economy: 0
        };
      });

      if (doubleSidedId) {
        const dsPlayer = localPlayers.find(p => p.id === doubleSidedId);
        if (dsPlayer) {
          bowlingList.push({
            playerId: doubleSidedId,
            name: `${dsPlayer.name} (DS)`,
            overs: 0,
            balls: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            economy: 0
          });
        }
      }

      return {
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 },
        batting: battingList,
        bowling: bowlingList
      };
    };

    const newMatch: Match = {
      id: matchId,
      status: 'scoring',
      overs: activeOvers,
      teamA: {
        name: teamAName,
        players: teamAPlayers
      },
      teamB: {
        name: teamBName,
        players: teamBPlayers
      },
      doubleSidedPlayerId: doubleSidedId,
      captainA,
      captainB,
      battingFirst,
      scores: {
        teamA: generateEmptyScore(teamAPlayers),
        teamB: generateEmptyScore(teamBPlayers)
      },
      currentInnings: 1,
      currentBatter1Id: battingFirst === 'teamA' ? teamAPlayers[0] : teamBPlayers[0],
      currentBatter2Id: battingFirst === 'teamA' ? teamAPlayers[1] || teamAPlayers[0] : teamBPlayers[1] || teamBPlayers[0],
      currentBowlerId: battingFirst === 'teamA' ? teamBPlayers[0] : teamAPlayers[0],
      oversCompleted: 0,
      ballsInOver: 0,
      target: null,
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tossWinner: tossWinner === 'teamA' ? teamAName : teamBName,
      tossDecision
    };

    try {
      await setDoc(doc(db, 'matches', matchId), newMatch);

      // Update attendance count for playing players
      const allPlaying = [...teamAPlayers, ...teamBPlayers];
      if (doubleSidedId) allPlaying.push(doubleSidedId);

      await Promise.all(
        allPlaying.map(async (id) => {
          const player = localPlayers.find(p => p.id === id);
          if (player) {
            await updateDoc(doc(db, 'players', id), {
              attendance: (player.attendance || 0) + 1,
              updatedAt: new Date().toISOString()
            });
          }
        })
      );

      onMatchCreated(matchId);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `matches/${matchId}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-[#0A0D14] border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-[#0F1218] to-[#141824]">
          <div className="flex items-center gap-2">
            <Trophy className="text-[#A3FF12]" size={20} />
            <div>
              <h3 className="font-extrabold text-white text-base">New Match Setup Flow</h3>
              <p className="text-[11px] text-white/50">Follow the steps to configure and start live scoring</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 text-white/60 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Steps Progress Bar */}
        <div className="bg-white/5 px-6 py-2 border-b border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-widest text-white/40">
          <div className={`flex items-center gap-1.5 ${step === 'teams' ? 'text-[#A3FF12]' : 'text-emerald-400'}`}>
            <span>1. Teams & Captains</span>
            {stepTeamsValid && <CheckCircle2 size={12} className="text-emerald-400" />}
          </div>
          <ArrowRight size={12} />
          <div className={`flex items-center gap-1.5 ${step === 'toss' ? 'text-[#A3FF12]' : tossCompleted ? 'text-emerald-400' : ''}`}>
            <span>2. Animated Toss</span>
            {tossCompleted && <CheckCircle2 size={12} className="text-emerald-400" />}
          </div>
          <ArrowRight size={12} />
          <div className={`flex items-center gap-1.5 ${step === 'decision' ? 'text-[#A3FF12]' : ''}`}>
            <span>3. Bat/Bowl Select</span>
          </div>
        </div>

        {/* Scrollable Step Content Container */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: TEAMS & CAPTAINS SETUP */}
          {step === 'teams' && (
            <div className="space-y-6">
              
              {/* Names randomizer and Format config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="space-y-2">
                  <span className="text-[11px] text-white/50 font-black uppercase tracking-wider block">Team Names (Randomized)</span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/30 border border-white/5 px-3 py-2 rounded-xl text-xs font-black text-[#A3FF12] uppercase tracking-wider">
                      {teamAName}
                    </div>
                    <span className="text-white/20 font-bold text-xs">VS</span>
                    <div className="flex-1 bg-black/30 border border-white/5 px-3 py-2 rounded-xl text-xs font-black text-emerald-400 uppercase tracking-wider">
                      {teamBName}
                    </div>
                    <button
                      type="button"
                      onClick={handleRandomizeNames}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/10 text-white cursor-pointer"
                      title="Shuffle Team Names"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-white/50 font-black uppercase tracking-wider block">Overs Format</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 6, 8].map(o => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setOversCount(o)}
                        className={`py-1.5 text-xs font-black rounded-xl border transition cursor-pointer ${
                          oversCount === o
                            ? 'bg-[#A3FF12] border-[#A3FF12] text-black'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        {o} Overs
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setOversCount(0)}
                      className={`py-1.5 text-xs font-black rounded-xl border transition cursor-pointer ${
                        oversCount === 0
                          ? 'bg-[#A3FF12] border-[#A3FF12] text-black'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {oversCount === 0 && (
                    <input
                      type="number"
                      placeholder="Custom overs count..."
                      value={customOvers}
                      onChange={(e) => setCustomOvers(e.target.value)}
                      className="w-full mt-2 px-3 py-1.5 bg-[#0F1218] text-white border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#A3FF12] text-xs font-mono"
                    />
                  )}
                </div>
              </div>

              {/* Balanced & Captains Validation Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
                  isBalanced
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  <div className="flex items-center gap-3">
                    {isBalanced ? (
                      <CheckCircle2 size={16} className="shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="shrink-0 animate-bounce" />
                    )}
                    <div>
                      <span className="font-bold block uppercase tracking-wider text-[10px]">Team Balance Check</span>
                      {isBalanced 
                        ? `Teams are balanced! (${teamAPlayers.length} vs ${teamBPlayers.length})`
                        : `Expected ${expectedTeamSize} per team. Current: ${teamAPlayers.length} vs ${teamBPlayers.length}.`
                      }
                    </div>
                  </div>
                  {!isBalanced && availableCount >= 2 && (
                    <button
                      type="button"
                      onClick={handleAutoBalanceTeams}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-[9px] uppercase font-black tracking-wider transition cursor-pointer"
                    >
                      Auto-Balance
                    </button>
                  )}
                </div>

                <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
                  hasCaptains
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  {hasCaptains ? (
                    <CheckCircle2 size={16} className="shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px]">Captains Selection</span>
                    {hasCaptains
                      ? 'Both teams have captains assigned!'
                      : 'Assign one captain for each team to proceed.'
                    }
                  </div>
                </div>
              </div>

              {/* Double-Sided Player Section (Labeled clearly in separate section) */}
              <div className="bg-[#11141D] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Users size={14} className="text-amber-400" /> Double-Sided Player Rules
                    </h5>
                    <p className="text-[11px] text-white/50 max-w-xl leading-relaxed font-sans">
                      {isOdd ? (
                        <span className="text-amber-400/90 font-bold block">
                          ⚠️ ODD PLAYER COUNT DETECTED ({availableCount} available). Exactly one player must be designated as a Double-Sided Player. The remaining {availableCount - 1} players will be split equally between both teams ({expectedTeamSize} vs {expectedTeamSize}).
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold block">
                          ✓ EVEN PLAYER COUNT DETECTED ({availableCount} available). No Double-Sided Player is required. Players will be split equally between both teams ({expectedTeamSize} vs {expectedTeamSize}).
                        </span>
                      )}
                    </p>
                  </div>

                  {isOdd && (
                    <div className="flex items-center gap-2">
                      <select
                        value={doubleSidedId || ''}
                        onChange={(e) => handleSelectDoubleSided(e.target.value || null)}
                        className="text-xs bg-[#1A1E29] border border-amber-500/20 text-amber-400 px-3 py-2 rounded-xl focus:outline-none font-black uppercase cursor-pointer"
                      >
                        <option value="" disabled>-- Select DS Player --</option>
                        {availableList.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={suggestRandomDoubleSided}
                        className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
                      >
                        Suggest Random
                      </button>
                    </div>
                  )}
                </div>

                {isOdd && doubleSidedId && (
                  <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                    <img
                      src={getPlayerAvatar(doubleSidedId)}
                      alt=""
                      className="w-10 h-10 rounded-full bg-white/5 border-2 border-amber-500"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-extrabold text-white text-xs uppercase">
                        {getPlayerName(doubleSidedId)} <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded ml-2 font-black">DOUBLE-SIDED PLAYER (DS)</span>
                      </p>
                      <p className="text-[10px] text-white/40 font-mono mt-0.5">
                        Removed from both teams. Will bat and bowl for both sides in separate scorecard entries.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Three-Column Draft Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Column 1: Team A */}
                <div className="bg-[#14181F] border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                    <span className="font-black text-[#A3FF12] text-xs uppercase tracking-widest truncate">{teamAName}</span>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white font-mono text-[10px] rounded">
                      {teamAPlayers.length} Players
                    </span>
                  </div>

                  {/* Team A Captain select */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">Assign Captain</span>
                    <select
                      value={captainA}
                      onChange={(e) => setCaptainA(e.target.value)}
                      className="w-full text-xs bg-[#0F1218] border border-white/10 text-white px-2 py-1.5 rounded-lg focus:outline-none font-mono"
                    >
                      <option value="">Select Captain</option>
                      {teamAPlayers.map(id => (
                        <option key={id} value={id}>{getPlayerName(id)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {teamAPlayers.length === 0 ? (
                      <div className="text-center py-8 text-white/20 text-xs uppercase font-extrabold tracking-widest border border-dashed border-white/5 rounded-xl">
                        Empty Team
                      </div>
                    ) : (
                      teamAPlayers.map(id => (
                        <div key={id} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <img src={getPlayerAvatar(id)} alt="" className="w-5 h-5 rounded-full bg-white/5 border border-white/10" referrerPolicy="no-referrer" />
                            <span className="font-extrabold text-white">
                              {getPlayerName(id)}
                              {captainA === id && <span className="ml-1.5 text-xs text-yellow-400" title="Captain">👑 (C)</span>}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => moveToTeam(id, 'pool')}
                            className="text-[10px] text-white/50 hover:text-rose-400 font-bold px-1.5 py-0.5 hover:bg-white/5 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Pool of Available Players */}
                <div className="bg-[#14181F] border border-white/5 p-4 rounded-2xl flex flex-col gap-3 lg:col-span-1">
                  <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                    <span className="font-black text-white text-xs uppercase tracking-widest">Player Pool</span>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white font-mono text-[10px] rounded">
                      {localPlayers.filter(p => !teamAPlayers.includes(p.id) && !teamBPlayers.includes(p.id) && p.id !== doubleSidedId).length} Left
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {localPlayers.map(p => {
                      const isAssigned = teamAPlayers.includes(p.id) || teamBPlayers.includes(p.id) || doubleSidedId === p.id;
                      if (isAssigned) return null;

                      return (
                        <div key={p.id} className={`p-2 rounded-xl text-xs border transition ${
                          p.available 
                            ? 'bg-white/5 border-white/5' 
                            : 'bg-red-500/5 border-red-500/10 opacity-50'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={p.avatar} alt="" className="w-5 h-5 rounded-full bg-white/5 border border-white/10" referrerPolicy="no-referrer" />
                              <span className="font-extrabold text-white truncate">{p.name}</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => togglePlayerAvailability(p.id)}
                              className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded cursor-pointer ${
                                p.available
                                  ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                              }`}
                            >
                              {p.available ? 'In' : 'Out'}
                            </button>
                          </div>

                          {p.available && (
                            <div className="grid grid-cols-2 gap-1 mt-2 pt-1 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => moveToTeam(p.id, 'A')}
                                className="text-[10px] bg-[#A3FF12]/10 hover:bg-[#A3FF12]/20 text-[#A3FF12] border border-[#A3FF12]/15 py-1 px-1 rounded-lg font-bold uppercase transition text-center cursor-pointer"
                              >
                                + Team A
                              </button>
                              <button
                                type="button"
                                onClick={() => moveToTeam(p.id, 'B')}
                                className="text-[10px] bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-400/15 py-1 px-1 rounded-lg font-bold uppercase transition text-center cursor-pointer"
                              >
                                + Team B
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3: Team B */}
                <div className="bg-[#14181F] border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="border-b border-white/5 pb-2 flex items-center justify-between">
                    <span className="font-black text-emerald-400 text-xs uppercase tracking-widest truncate">{teamBName}</span>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-white font-mono text-[10px] rounded">
                      {teamBPlayers.length} Players
                    </span>
                  </div>

                  {/* Team B Captain select */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block">Assign Captain</span>
                    <select
                      value={captainB}
                      onChange={(e) => setCaptainB(e.target.value)}
                      className="w-full text-xs bg-[#0F1218] border border-white/10 text-white px-2 py-1.5 rounded-lg focus:outline-none font-mono"
                    >
                      <option value="">Select Captain</option>
                      {teamBPlayers.map(id => (
                        <option key={id} value={id}>{getPlayerName(id)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {teamBPlayers.length === 0 ? (
                      <div className="text-center py-8 text-white/20 text-xs uppercase font-extrabold tracking-widest border border-dashed border-white/5 rounded-xl">
                        Empty Team
                      </div>
                    ) : (
                      teamBPlayers.map(id => (
                        <div key={id} className="flex items-center justify-between p-2 bg-white/5 border border-white/5 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <img src={getPlayerAvatar(id)} alt="" className="w-5 h-5 rounded-full bg-white/5 border border-white/10" referrerPolicy="no-referrer" />
                            <span className="font-extrabold text-white">
                              {getPlayerName(id)}
                              {captainB === id && <span className="ml-1.5 text-xs text-yellow-400" title="Captain">👑 (C)</span>}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => moveToTeam(id, 'pool')}
                            className="text-[10px] text-white/50 hover:text-rose-400 font-bold px-1.5 py-0.5 hover:bg-white/5 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="flex justify-end pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    if (!stepTeamsValid) {
                      alert('Please balance both teams and assign a captain for each team before proceeding.');
                      return;
                    }
                    setStep('toss');
                  }}
                  disabled={!stepTeamsValid}
                  className={`px-6 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition flex items-center gap-1.5 ${
                    stepTeamsValid
                      ? 'bg-[#A3FF12] hover:bg-[#A3FF12]/80 text-black cursor-pointer'
                      : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  Configure Toss <ArrowRight size={14} />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: ANIMATED TOSS SCREEN */}
          {step === 'toss' && (
            <div className="space-y-8 max-w-lg mx-auto py-4">
              
              <div className="text-center space-y-2">
                <h4 className="font-extrabold text-white text-base uppercase tracking-wider">The Coin Toss</h4>
                <p className="text-xs text-white/50">Displaying captains. Choose who will call the flip.</p>
              </div>

              {/* Captain Comparison cards */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Team A Captain card */}
                <button
                  type="button"
                  onClick={() => {
                    if (tossCompleted || isFlipping) return;
                    setTossCaller('teamA');
                    setTossCall(null);
                  }}
                  className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                    tossCaller === 'teamA'
                      ? 'bg-[#A3FF12]/5 border-[#A3FF12]/30 ring-1 ring-[#A3FF12]/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <img src={getPlayerAvatar(captainA)} alt="" className="w-14 h-14 rounded-full bg-white/5 border-2 border-[#A3FF12]" referrerPolicy="no-referrer" />
                  <div>
                    <span className="text-[10px] bg-[#A3FF12]/10 text-[#A3FF12] border border-[#A3FF12]/25 px-2 py-0.5 rounded-full font-black uppercase tracking-wider block mb-1">
                      {teamAName}
                    </span>
                    <span className="font-extrabold text-white text-sm block">
                      {getPlayerName(captainA)}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono block">Captain (C)</span>
                  </div>
                  {tossCaller === 'teamA' && <span className="text-xs text-[#A3FF12] font-black uppercase mt-1">✓ Caller</span>}
                </button>

                {/* Team B Captain card */}
                <button
                  type="button"
                  onClick={() => {
                    if (tossCompleted || isFlipping) return;
                    setTossCaller('teamB');
                    setTossCall(null);
                  }}
                  className={`p-4 rounded-2xl border text-center transition flex flex-col items-center gap-3 cursor-pointer ${
                    tossCaller === 'teamB'
                      ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <img src={getPlayerAvatar(captainB)} alt="" className="w-14 h-14 rounded-full bg-white/5 border-2 border-emerald-400" referrerPolicy="no-referrer" />
                  <div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-black uppercase tracking-wider block mb-1">
                      {teamBName}
                    </span>
                    <span className="font-extrabold text-white text-sm block">
                      {getPlayerName(captainB)}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono block">Captain (C)</span>
                  </div>
                  {tossCaller === 'teamB' && <span className="text-xs text-emerald-400 font-black uppercase mt-1">✓ Caller</span>}
                </button>

              </div>

              {/* Toss Call Selector (Heads or Tails) */}
              {tossCaller && !tossCompleted && !isFlipping && (
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <span className="text-xs text-white font-extrabold uppercase tracking-widest block">
                    {tossCaller === 'teamA' ? getPlayerName(captainA) : getPlayerName(captainB)}'s Toss Call
                  </span>
                  <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setTossCall('heads')}
                      className={`py-2 px-4 rounded-xl border font-black uppercase text-xs tracking-wider transition cursor-pointer ${
                        tossCall === 'heads'
                          ? 'bg-[#A3FF12] border-[#A3FF12] text-black'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      🪙 Heads
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossCall('tails')}
                      className={`py-2 px-4 rounded-xl border font-black uppercase text-xs tracking-wider transition cursor-pointer ${
                        tossCall === 'tails'
                          ? 'bg-[#A3FF12] border-[#A3FF12] text-black'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      🪙 Tails
                    </button>
                  </div>
                </div>
              )}

              {/* Coin flip animation arena */}
              {tossCall && (
                <div className="flex flex-col items-center justify-center space-y-4">
                  
                  {/* Coin Div with standard rotation and sleek bounce */}
                  <motion.div
                    animate={isFlipping ? {
                      rotateY: [0, 360, 720, 1080, 1440, 1800],
                      scale: [1, 1.25, 1.35, 1.25, 1],
                      y: [0, -100, -120, -60, 0]
                    } : {}}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-black uppercase text-lg select-none shadow-2xl relative ${
                      isFlipping 
                        ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300' 
                        : tossCompleted 
                          ? 'border-emerald-400 bg-emerald-500/20 text-[#A3FF12]' 
                          : 'border-white/20 bg-white/5 text-white/50'
                    }`}
                  >
                    {isFlipping ? 'SPIN' : tossResult ? tossResult.toUpperCase() : 'COIN'}
                  </motion.div>

                  {!isFlipping && !tossCompleted && (
                    <button
                      type="button"
                      onClick={handleFlipCoin}
                      className="px-6 py-2.5 bg-[#A3FF12] text-black hover:bg-[#A3FF12]/80 font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                    >
                      Flip Coin Now
                    </button>
                  )}

                  {isFlipping && (
                    <span className="text-xs font-bold text-yellow-400 animate-pulse uppercase tracking-widest">
                      Spanning in mid-air...
                    </span>
                  )}

                </div>
              )}

              {/* Toss Result Outcome Panel */}
              {tossCompleted && tossWinner && (
                <div className="bg-[#14181F] border border-white/5 p-5 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <Trophy className="mx-auto text-yellow-400" size={32} />
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-white text-base">
                      {tossWinner === 'teamA' ? teamAName : teamBName} won the toss!
                    </h5>
                    <p className="text-xs text-white/60">
                      Caller specified <span className="text-[#A3FF12] font-mono uppercase">"{tossCall}"</span>, Coin landed on <span className="text-[#A3FF12] font-mono uppercase">"{tossResult}"</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('teams')}
                  className="px-4 py-2 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Back
                </button>

                {tossCompleted && (
                  <button
                    type="button"
                    onClick={() => setStep('decision')}
                    className="px-5 py-2.5 bg-[#A3FF12] text-black hover:bg-[#A3FF12]/80 font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    Select Bat or Bowl <ArrowRight size={14} />
                  </button>
                )}
              </div>

            </div>
          )}

          {/* STEP 3: BAT OR BOWL DECISION SCREEN */}
          {step === 'decision' && (
            <div className="space-y-6 max-w-lg mx-auto py-4 text-center">
              
              <div className="space-y-2">
                <Trophy className="mx-auto text-yellow-400 animate-bounce" size={40} />
                <h4 className="font-black text-white text-base uppercase tracking-wider">Bat or Bowl Choice</h4>
                <p className="text-xs text-white/50">
                  Toss winner: <strong>{tossWinner === 'teamA' ? teamAName : teamBName}</strong>
                </p>
                <p className="text-[11px] text-white/40">
                  Captain {tossWinner === 'teamA' ? getPlayerName(captainA) : getPlayerName(captainB)} should select the match choice first.
                </p>
              </div>

              {/* Big Selectable Button Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  className={`p-6 border rounded-2xl flex flex-col items-center gap-3 transition cursor-pointer ${
                    tossDecision === 'bat'
                      ? 'bg-[#A3FF12]/10 border-[#A3FF12] text-[#A3FF12] ring-1 ring-[#A3FF12]/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="text-3xl">🏸</span>
                  <span className="font-extrabold text-sm uppercase tracking-wider">Elect to Bat</span>
                  <span className="text-[10px] text-white/40">Will bat first in Innings 1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  className={`p-6 border rounded-2xl flex flex-col items-center gap-3 transition cursor-pointer ${
                    tossDecision === 'bowl'
                      ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="text-3xl">🥎</span>
                  <span className="font-extrabold text-sm uppercase tracking-wider">Elect to Bowl</span>
                  <span className="text-[10px] text-white/40">Will bowl first in Innings 1</span>
                </button>
              </div>

              {/* Automatic Configuration Preview summary */}
              {tossDecision && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-xs text-white/80 space-y-1 text-left">
                  <span className="font-bold text-white/50 uppercase tracking-widest block text-[9px] mb-1">Preview Lineup Configuration</span>
                  <div>• <strong>Innings 1 Batting:</strong> {
                    tossWinner === 'teamA' 
                      ? (tossDecision === 'bat' ? teamAName : teamBName)
                      : (tossDecision === 'bat' ? teamBName : teamAName)
                  }</div>
                  <div>• <strong>Innings 1 Bowling:</strong> {
                    tossWinner === 'teamA' 
                      ? (tossDecision === 'bat' ? teamBName : teamAName)
                      : (tossDecision === 'bat' ? teamAName : teamBName)
                  }</div>
                  <div>• <strong>Overs format:</strong> {activeOvers} Overs match format</div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between border-t border-white/5 pt-6">
                <button
                  type="button"
                  onClick={() => setStep('toss')}
                  className="px-4 py-2 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeMatch}
                  disabled={!tossDecision || saving}
                  className={`px-6 py-3 font-black text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-2 ${
                    tossDecision && !saving
                      ? 'bg-[#A3FF12] text-black hover:bg-[#A3FF12]/80 cursor-pointer'
                      : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {saving ? (
                    'Initializing Match...'
                  ) : (
                    <>
                      Start Live Match Scoring <Play size={12} fill="currentColor" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
