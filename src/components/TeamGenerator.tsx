import React, { useState, useEffect } from 'react';
import { Player, PlayerStats, Match } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Users, Shuffle, ArrowLeftRight, Trophy, Sparkles, AlertCircle } from 'lucide-react';

interface TeamGeneratorProps {
  players: Player[];
  playerStats: PlayerStats[];
  onMatchCreated: (matchId: string) => void;
}

export default function TeamGenerator({ players, playerStats, onMatchCreated }: TeamGeneratorProps) {
  const availablePlayers = players.filter(p => p.available);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [doubleSidedId, setDoubleSidedId] = useState<string | null>(null);

  const isOddCount = availablePlayers.length % 2 !== 0;
  const expectedTeamSize = isOddCount ? (availablePlayers.length - 1) / 2 : availablePlayers.length / 2;
  
  const [teamAName, setTeamAName] = useState<string>('RAMCO VEERARGAL');
  const [teamBName, setTeamBName] = useState<string>('HARD WORKERS');

  const [captainA, setCaptainA] = useState<string>('');
  const [captainB, setCaptainB] = useState<string>('');
  const [selectedOvers, setSelectedOvers] = useState<number>(6);
  const [customOvers, setCustomOvers] = useState<string>('');

  // Toss states
  const [tossCompleted, setTossCompleted] = useState(false);
  const [tossWinner, setTossWinner] = useState<'teamA' | 'teamB' | null>(null);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);
  const [tossFlipping, setTossFlipping] = useState(false);

  // Auto-generate teams on mount or when available players change
  useEffect(() => {
    if (availablePlayers.length > 0) {
      handleAutoBalance();
    }
  }, [players]);

  const handleAutoBalance = () => {
    if (availablePlayers.length < 2) return;

    // Randomly assign team names
    const names = Math.random() < 0.5 
      ? ['RAMCO VEERARGAL', 'HARD WORKERS'] 
      : ['HARD WORKERS', 'RAMCO VEERARGAL'];
    setTeamAName(names[0]);
    setTeamBName(names[1]);

    // Get a map of player scores (MVP points)
    const statsMap = new Map<string, number>();
    playerStats.forEach(stat => {
      statsMap.set(stat.id, stat.awards.mvpPoints || 0);
    });

    // Sort available players by historical performance (descending)
    const sorted = [...availablePlayers].sort((a, b) => {
      const scoreA = statsMap.get(a.id) || 0;
      const scoreB = statsMap.get(b.id) || 0;
      return scoreB - scoreA;
    });

    const listA: string[] = [];
    const listB: string[] = [];
    let dsId: string | null = null;

    // If odd number of players, set the median player as double-sided player
    const isOdd = sorted.length % 2 !== 0;
    let pool = [...sorted];

    if (isOdd) {
      // Pick the double-sided player (usually middle tier or lowest tier, let's take the middle one to keep it fun)
      const midIndex = Math.floor(pool.length / 2);
      const [dsPlayer] = pool.splice(midIndex, 1);
      dsId = dsPlayer.id;
    }

    // Snake draft distribution for ultimate balancing
    pool.forEach((player, idx) => {
      if (idx % 4 === 0 || idx % 4 === 3) {
        listA.push(player.id);
      } else {
        listB.push(player.id);
      }
    });

    setTeamA(listA);
    setTeamB(listB);
    setDoubleSidedId(dsId);

    // Set captains
    if (listA.length > 0) setCaptainA(listA[0]);
    if (listB.length > 0) setCaptainB(listB[0]);
    setTossCompleted(false);
    setTossWinner(null);
    setTossDecision(null);
  };

  // Swap player between Team A and Team B
  const handleSwap = (playerId: string, from: 'A' | 'B') => {
    if (from === 'A') {
      setTeamA(teamA.filter(id => id !== playerId));
      setTeamB([...teamB, playerId]);
    } else {
      setTeamB(teamB.filter(id => id !== playerId));
      setTeamA([...teamA, playerId]);
    }
  };

  // Set double sided player
  const handleSetDoubleSided = (playerId: string | null) => {
    setDoubleSidedId(playerId);
    if (playerId) {
      setTeamA(prev => prev.filter(id => id !== playerId));
      setTeamB(prev => prev.filter(id => id !== playerId));
      if (captainA === playerId) setCaptainA('');
      if (captainB === playerId) setCaptainB('');
    }
  };

  const suggestRandomDoubleSided = () => {
    if (availablePlayers.length === 0) return;
    const rand = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    handleSetDoubleSided(rand.id);
  };

  // Synchronize Double-Sided Player based on total available players
  useEffect(() => {
    const isOdd = availablePlayers.length % 2 !== 0;
    if (!isOdd) {
      // Even number: No Double-Sided player should exist
      if (doubleSidedId !== null) {
        setDoubleSidedId(null);
      }
    } else {
      // Odd number: Exactly one player must be designated as Double-Sided
      const currentIsAvailable = availablePlayers.some(p => p.id === doubleSidedId);
      if (!doubleSidedId || !currentIsAvailable) {
        if (availablePlayers.length > 0) {
          const unassigned = availablePlayers.filter(p => !teamA.includes(p.id) && !teamB.includes(p.id));
          if (unassigned.length > 0) {
            handleSetDoubleSided(unassigned[0].id);
          } else {
            handleSetDoubleSided(availablePlayers[0].id);
          }
        }
      }
    }
  }, [availablePlayers, doubleSidedId]);

  // Run Toss Coin Flip
  const handleToss = () => {
    setTossFlipping(true);
    setTimeout(() => {
      const winner = Math.random() > 0.5 ? 'teamA' : 'teamB';
      const decision = Math.random() > 0.5 ? 'bat' : 'bowl';
      setTossWinner(winner);
      setTossDecision(decision);
      setTossCompleted(true);
      setTossFlipping(false);
    }, 1200);
  };

  const handleStartMatch = async () => {
    if (teamA.length === 0 || teamB.length === 0) {
      alert('Please ensure both teams have at least 1 player.');
      return;
    }

    const oversCount = selectedOvers === 0 ? parseInt(customOvers) || 5 : selectedOvers;
    const matchId = `match_${Date.now()}`;

    // Determine who bats first based on toss
    let battingFirst: 'teamA' | 'teamB' = 'teamA';
    if (tossWinner && tossDecision) {
      if (tossWinner === 'teamA') {
        battingFirst = tossDecision === 'bat' ? 'teamA' : 'teamB';
      } else {
        battingFirst = tossDecision === 'bat' ? 'teamB' : 'teamA';
      }
    } else {
      // Default to Team A batting if no toss is run
      battingFirst = 'teamA';
    }

    // Helper to generate empty team score
    const generateEmptyScore = (playerIds: string[]) => {
      const battingList = playerIds.map(id => {
        const player = players.find(p => p.id === id);
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

      // Include double-sided player in batting list too!
      if (doubleSidedId) {
        const dsPlayer = players.find(p => p.id === doubleSidedId);
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
        const player = players.find(p => p.id === id);
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

      // Add DS to bowling too
      if (doubleSidedId) {
        const dsPlayer = players.find(p => p.id === doubleSidedId);
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
      overs: oversCount,
      teamA: {
        name: teamAName,
        players: teamA
      },
      teamB: {
        name: teamBName,
        players: teamB
      },
      doubleSidedPlayerId: doubleSidedId,
      captainA,
      captainB,
      battingFirst,
      scores: {
        teamA: generateEmptyScore(teamA),
        teamB: generateEmptyScore(teamB)
      },
      currentInnings: 1,
      currentBatter1Id: battingFirst === 'teamA' ? teamA[0] : teamB[0],
      currentBatter2Id: battingFirst === 'teamA' ? teamA[1] || teamA[0] : teamB[1] || teamB[0],
      currentBowlerId: battingFirst === 'teamA' ? teamB[0] : teamA[0],
      oversCompleted: 0,
      ballsInOver: 0,
      target: null,
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (tossWinner) {
      newMatch.tossWinner = tossWinner === 'teamA' ? teamAName : teamBName;
    }
    if (tossDecision) {
      newMatch.tossDecision = tossDecision;
    }

    try {
      await setDoc(doc(db, 'matches', matchId), newMatch);
      
      // Update attendance count for all playing users
      const allPlaying = [...teamA, ...teamB];
      if (doubleSidedId) allPlaying.push(doubleSidedId);

      await Promise.all(
        allPlaying.map(async (id) => {
          const player = players.find(p => p.id === id);
          if (player) {
            await setDoc(doc(db, 'players', id), {
              ...player,
              attendance: player.attendance + 1,
              updatedAt: new Date().toISOString()
            });
          }
        })
      );

      onMatchCreated(matchId);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `matches/${matchId}`);
    }
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-[#0F1218] border border-white/5 p-5 rounded-2xl text-white space-y-2 shadow-xl">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-[#A3FF12] flex items-center gap-2">
          <Sparkles className="text-[#A3FF12]" size={18} /> Smart Team Generator
        </h3>
        <p className="text-xs text-white/50">
          Available players: <strong>{availablePlayers.length}</strong>. Supports automatic balance drafting & Double-Sided rules.
        </p>
      </div>

      {availablePlayers.length < 2 ? (
        <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-center space-y-3">
          <AlertCircle className="mx-auto text-red-400" size={24} />
          <p className="text-sm text-red-400 font-extrabold uppercase tracking-widest">Insufficient Players Available</p>
          <p className="text-xs text-white/50">
            You need at least 2 available players to generate teams. Go to "Players" to register or mark them available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams Draft Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Teams & Formations</h4>
              <button
                onClick={handleAutoBalance}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Shuffle size={12} /> Auto-Balance Teams
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team A Card */}
              <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-black text-[#A3FF12] text-xs uppercase tracking-widest">{teamAName} ({teamA.length})</span>
                  <select
                    value={captainA}
                    onChange={(e) => setCaptainA(e.target.value)}
                    className="text-xs bg-[#0F1218] border border-white/10 text-white px-2 py-1 rounded-lg focus:outline-none font-mono"
                  >
                    <option value="">Captain</option>
                    {teamA.map(id => (
                      <option key={id} value={id}>{getPlayerName(id)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {teamA.map(id => (
                    <div key={id} className="flex items-center justify-between text-xs p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl transition">
                      <span className="font-bold text-white">
                        {getPlayerName(id)} {captainA === id && <strong className="text-yellow-400 font-black ml-1.5">(C)</strong>}
                      </span>
                      <button
                        onClick={() => handleSwap(id, 'A')}
                        className="p-1 text-white/40 hover:text-[#A3FF12] hover:bg-[#A3FF12]/10 rounded transition cursor-pointer"
                        title="Swap to Team B"
                      >
                        <ArrowLeftRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team B Card */}
              <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="font-black text-emerald-400 text-xs uppercase tracking-widest">{teamBName} ({teamB.length})</span>
                  <select
                    value={captainB}
                    onChange={(e) => setCaptainB(e.target.value)}
                    className="text-xs bg-[#0F1218] border border-white/10 text-white px-2 py-1 rounded-lg focus:outline-none font-mono"
                  >
                    <option value="">Captain</option>
                    {teamB.map(id => (
                      <option key={id} value={id}>{getPlayerName(id)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {teamB.map(id => (
                    <div key={id} className="flex items-center justify-between text-xs p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl transition">
                      <span className="font-bold text-white">
                        {getPlayerName(id)} {captainB === id && <strong className="text-yellow-400 font-black ml-1.5">(C)</strong>}
                      </span>
                      <button
                        onClick={() => handleSwap(id, 'B')}
                        className="p-1 text-white/40 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition cursor-pointer"
                        title="Swap to Team A"
                      >
                        <ArrowLeftRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Double Sided Player Option */}
            <div className="bg-[#11141D] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={14} className="text-amber-400" /> Double-Sided Player Rules
                  </h5>
                  <p className="text-[11px] text-white/50 max-w-xl leading-relaxed font-sans">
                    {availablePlayers.length % 2 !== 0 ? (
                      <span className="text-amber-400/90 font-bold block">
                        ⚠️ ODD PLAYER COUNT DETECTED ({availablePlayers.length} available). Exactly one player must be designated as a Double-Sided Player. The remaining {availablePlayers.length - 1} players will be split equally between both teams ({expectedTeamSize} vs {expectedTeamSize}).
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold block">
                        ✓ EVEN PLAYER COUNT DETECTED ({availablePlayers.length} available). No Double-Sided Player is required. Players will be split equally between both teams ({expectedTeamSize} vs {expectedTeamSize}).
                      </span>
                    )}
                  </p>
                </div>

                {availablePlayers.length % 2 !== 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={doubleSidedId || ''}
                      onChange={(e) => handleSetDoubleSided(e.target.value || null)}
                      className="text-xs bg-[#1A1E29] border border-amber-500/20 text-amber-400 px-3 py-2 rounded-xl focus:outline-none font-black uppercase cursor-pointer"
                    >
                      <option value="" disabled>-- Select DS Player --</option>
                      {availablePlayers.map(p => (
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

              {availablePlayers.length % 2 !== 0 && doubleSidedId && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                    <p className="font-extrabold text-white text-xs uppercase">
                      Selected: <strong className="text-amber-400">{getPlayerName(doubleSidedId)}</strong> <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded ml-2 font-black">DOUBLE-SIDED PLAYER (DS)</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Config, Toss & Start Panel */}
          <div className="space-y-6">
            {/* Match Overs Setup */}
            <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-widest">Match Format</h4>
              <div className="grid grid-cols-4 gap-2">
                {[5, 6, 8].map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setSelectedOvers(o)}
                    className={`py-2 text-xs font-black rounded-xl border transition cursor-pointer ${
                      selectedOvers === o
                        ? 'bg-[#A3FF12] border-[#A3FF12] text-black'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {o} Overs
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedOvers(0)}
                  className={`py-2 text-xs font-black rounded-xl border transition cursor-pointer ${
                    selectedOvers === 0
                      ? 'bg-[#A3FF12] border-[#A3FF12] text-black'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  Custom
                </button>
              </div>

              {selectedOvers === 0 && (
                <input
                  type="number"
                  placeholder="Enter custom overs count"
                  value={customOvers}
                  onChange={(e) => setCustomOvers(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 text-white border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#A3FF12] text-xs font-mono"
                />
              )}
            </div>

            {/* Match Toss Configuration */}
            <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-widest">Match Toss Configuration</h4>
                {(tossCompleted || tossWinner || tossDecision) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTossCompleted(false);
                      setTossWinner(null);
                      setTossDecision(null);
                    }}
                    className="text-[10px] text-white/45 hover:text-white uppercase font-black tracking-wider hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Toss Winner Selector */}
              <div className="space-y-2">
                <span className="text-[11px] text-white/50 font-black uppercase tracking-wider block">Who won the toss?</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTossWinner('teamA');
                      setTossCompleted(true);
                    }}
                    className={`py-2 px-1 text-[11px] truncate font-bold rounded-xl border transition cursor-pointer ${
                      tossWinner === 'teamA'
                        ? 'bg-[#A3FF12] border-[#A3FF12] text-black font-black'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {teamAName}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTossWinner('teamB');
                      setTossCompleted(true);
                    }}
                    className={`py-2 px-1 text-[11px] truncate font-bold rounded-xl border transition cursor-pointer ${
                      tossWinner === 'teamB'
                        ? 'bg-[#A3FF12] border-[#A3FF12] text-black font-black'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {teamBName}
                  </button>
                </div>
              </div>

              {/* Toss Decision Selector */}
              {tossWinner && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="text-[11px] text-white/50 font-black uppercase tracking-wider block">
                    What did {tossWinner === 'teamA' ? teamAName : teamBName} elect to do?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTossDecision('bat')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        tossDecision === 'bat'
                          ? 'bg-[#A3FF12] border-[#A3FF12] text-black font-black'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      🏸 Bat First
                    </button>
                    <button
                      type="button"
                      onClick={() => setTossDecision('bowl')}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        tossDecision === 'bowl'
                          ? 'bg-[#A3FF12] border-[#A3FF12] text-black font-black'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      🥎 Bowl First
                    </button>
                  </div>
                </div>
              )}

              {/* OR Divider */}
              {!tossWinner && (
                <div className="flex items-center gap-2 py-1 text-white/20 text-[10px] font-bold uppercase tracking-widest justify-center">
                  <div className="h-[1px] bg-white/5 flex-1"></div>
                  <span>OR</span>
                  <div className="h-[1px] bg-white/5 flex-1"></div>
                </div>
              )}

              {/* Automatic Coin Flipper */}
              <button
                type="button"
                onClick={handleToss}
                disabled={tossFlipping}
                className="w-full py-2 bg-[#0F1218] border border-white/10 hover:border-[#A3FF12] hover:bg-[#A3FF12]/10 text-white hover:text-[#A3FF12] text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trophy size={12} />
                {tossFlipping ? 'Flipping Coin...' : 'Flip Random Coin Toss'}
              </button>

              {tossCompleted && tossWinner && tossDecision && (
                <div className="p-3 bg-[#A3FF12]/10 border border-[#A3FF12]/20 rounded-xl text-center space-y-1">
                  <p className="text-xs text-white">
                    🏆 <strong>{tossWinner === 'teamA' ? teamAName : teamBName}</strong> won the toss
                  </p>
                  <p className="text-[11px] text-[#A3FF12] font-black uppercase tracking-widest">
                    Elected to {tossDecision} first
                  </p>
                </div>
              )}
            </div>

            {/* Start Scoring Button */}
            <button
              onClick={handleStartMatch}
              className="w-full py-3.5 bg-[#A3FF12] hover:bg-[#A3FF12]/80 text-black font-black uppercase tracking-widest rounded-2xl shadow-xl transition flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Trophy size={16} /> Start Match Scoring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
