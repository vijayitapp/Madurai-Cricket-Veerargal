import React, { useState, useEffect } from 'react';
import { Player, PlayerStats, Match } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { X, Trophy, AlertTriangle, ArrowRight, CheckCircle2, Users, Coins, Shuffle } from 'lucide-react';

interface NewMatchSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  playerStats: PlayerStats[];
  matches?: Match[];
  onMatchCreated: (matchId: string) => void;
}

type SetupStep = 'draft' | 'toss';

export default function NewMatchSetupModal({
  isOpen,
  onClose,
  players,
  playerStats,
  matches,
  onMatchCreated
}: NewMatchSetupModalProps) {
  const [step, setStep] = useState<SetupStep>('draft');

  // Config State
  const [teamAName, setTeamAName] = useState<string>('RAMCO VEERARGAL');
  const [teamBName, setTeamBName] = useState<string>('HARD WORKERS');
  const [oversCount, setOversCount] = useState<number>(6);
  const [customOvers, setCustomOvers] = useState<string>('');

  // Roster State
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [doubleSidedId, setDoubleSidedId] = useState<string | null>(null);
  const [captainA, setCaptainA] = useState<string>('');
  const [captainB, setCaptainB] = useState<string>('');

  // Toss State
  const [tossWinner, setTossWinner] = useState<'teamA' | 'teamB' | null>(null);
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl' | null>(null);
  
  // UI State
  const [saving, setSaving] = useState<boolean>(false);
  const [showAttendance, setShowAttendance] = useState<boolean>(false);
  const [isDragOverA, setIsDragOverA] = useState<boolean>(false);
  const [isDragOverB, setIsDragOverB] = useState<boolean>(false);

  // Initialize and Auto-Draft on open
  useEffect(() => {
    if (isOpen) {
      setLocalPlayers(players);
      setStep('draft');
      setTossWinner(null);
      setTossDecision(null);
      
      const isRandom = Math.random() < 0.5;
      setTeamAName(isRandom ? 'RAMCO VEERARGAL' : 'HARD WORKERS');
      setTeamBName(isRandom ? 'HARD WORKERS' : 'RAMCO VEERARGAL');
      
      const completedMatches = matches?.filter(m => m.status === 'completed' || m.status === 'aborted') || [];
      const lastMatch = completedMatches.length > 0 ? completedMatches[completedMatches.length - 1] : null;

      if (lastMatch) {
        setTeamAPlayers(lastMatch.teamA.players.filter(id => id !== lastMatch.doubleSidedPlayerId));
        setTeamBPlayers(lastMatch.teamB.players.filter(id => id !== lastMatch.doubleSidedPlayerId));
        setDoubleSidedId(lastMatch.doubleSidedPlayerId || null);
        setCaptainA(lastMatch.captainA || '');
        setCaptainB(lastMatch.captainB || '');
        setTeamAName(lastMatch.teamA.name);
        setTeamBName(lastMatch.teamB.name);
        setOversCount(lastMatch.overs);
      } else {
        performAutoDraft(players, playerStats);
      }
    }
  }, [isOpen, matches, players, playerStats]);

  const performAutoDraft = (currentPlayers: Player[], stats: PlayerStats[]) => {
    const available = currentPlayers.filter(p => p.available);
    if (available.length < 2) return;

    // Sort by MVP points
    const statsMap = new Map<string, number>();
    stats.forEach(s => statsMap.set(s.id, s.awards.mvpPoints || 0));
    const sorted = [...available].sort((a, b) => (statsMap.get(b.id) || 0) - (statsMap.get(a.id) || 0));

    const listA: string[] = [];
    const listB: string[] = [];
    let dsId: string | null = null;

    const isOdd = sorted.length % 2 !== 0;
    const pool = [...sorted];
    
    // Auto-assign lowest MVP as Double Sided if odd
    if (isOdd && pool.length > 0) {
      const ds = pool.pop(); // Remove the last (lowest MVP)
      if (ds) dsId = ds.id;
    }

    // Snake draft to balance teams
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

    // Auto-assign highest MVP as Captains
    if (listA.length > 0) setCaptainA(listA[0]);
    if (listB.length > 0) setCaptainB(listB[0]);
  };

  const toggleAttendance = async (playerId: string) => {
    const updated = localPlayers.map(p => p.id === playerId ? { ...p, available: !p.available } : p);
    setLocalPlayers(updated);
    
    // If they became unavailable, remove them from lists
    const p = localPlayers.find(x => x.id === playerId);
    if (p && p.available) {
      setTeamAPlayers(prev => prev.filter(id => id !== playerId));
      setTeamBPlayers(prev => prev.filter(id => id !== playerId));
      if (doubleSidedId === playerId) setDoubleSidedId(null);
    }
    
    // Persist silently
    try {
      const player = localPlayers.find(p => p.id === playerId);
      if (player) {
        await updateDoc(doc(db, 'players', playerId), { available: !player.available, updatedAt: new Date().toISOString() });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const moveToTeam = (playerId: string, targetTeam: 'A' | 'B' | 'DS') => {
    setTeamAPlayers(prev => prev.filter(id => id !== playerId));
    setTeamBPlayers(prev => prev.filter(id => id !== playerId));
    if (doubleSidedId === playerId) setDoubleSidedId(null);

    if (targetTeam === 'A') {
      setTeamAPlayers(prev => [...prev, playerId]);
      if (!captainA) setCaptainA(playerId);
    } else if (targetTeam === 'B') {
      setTeamBPlayers(prev => [...prev, playerId]);
      if (!captainB) setCaptainB(playerId);
    } else if (targetTeam === 'DS') {
      setDoubleSidedId(playerId);
    }
  };

  const handleDigitalToss = () => {
    const winner = Math.random() < 0.5 ? 'teamA' : 'teamB';
    const decision = Math.random() < 0.5 ? 'bat' : 'bowl';
    setTossWinner(winner);
    setTossDecision(decision);
  };

  const getPlayerName = (id: string) => localPlayers.find(p => p.id === id)?.name || 'Unknown';
  const getPlayerAvatar = (id: string) => localPlayers.find(p => p.id === id)?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`;

  const activeOvers = oversCount === 0 ? parseInt(customOvers) || 5 : oversCount;
  const isBalanced = teamAPlayers.length > 0 && teamAPlayers.length === teamBPlayers.length;

  const handleFinalizeMatch = async () => {
    if (!tossWinner || !tossDecision) return;
    setSaving(true);
    const matchId = `match_${Date.now()}`;
    const battingFirst = tossWinner === 'teamA' ? (tossDecision === 'bat' ? 'teamA' : 'teamB') : (tossDecision === 'bat' ? 'teamB' : 'teamA');

    const generateEmptyScore = (playerIds: string[]) => {
      const battingList = playerIds.map(id => ({
        playerId: id, name: getPlayerName(id), runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissalType: null
      }));
      const bowlingList = playerIds.map(id => ({
        playerId: id, name: getPlayerName(id), overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0
      }));

      if (doubleSidedId) {
        const dsName = `${getPlayerName(doubleSidedId)} (DS)`;
        battingList.push({ playerId: doubleSidedId, name: dsName, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissalType: null });
        bowlingList.push({ playerId: doubleSidedId, name: dsName, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 });
      }
      return { runs: 0, wickets: 0, balls: 0, extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 }, batting: battingList, bowling: bowlingList };
    };

    const newMatch: Match = {
      id: matchId, status: 'scoring', overs: activeOvers,
      teamA: { name: teamAName, players: teamAPlayers },
      teamB: { name: teamBName, players: teamBPlayers },
      doubleSidedPlayerId: doubleSidedId, captainA, captainB, battingFirst,
      scores: { teamA: generateEmptyScore(teamAPlayers), teamB: generateEmptyScore(teamBPlayers) },
      currentInnings: 1, currentBatter1Id: null,
      currentBatter2Id: null,
      currentBowlerId: null,
      oversCompleted: 0, ballsInOver: 0, target: null, timeline: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      tossWinner: tossWinner === 'teamA' ? teamAName : teamBName, tossDecision
    };

    try {
      await setDoc(doc(db, 'matches', matchId), newMatch);
      const allPlaying = [...teamAPlayers, ...teamBPlayers];
      if (doubleSidedId) allPlaying.push(doubleSidedId);
      
      await Promise.all(allPlaying.map(async (id) => {
        const player = localPlayers.find(p => p.id === id);
        if (player) {
          await updateDoc(doc(db, 'players', id), { attendance: (player.attendance || 0) + 1, updatedAt: new Date().toISOString() });
        }
      }));

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
      <div className="bg-sleek-bg border border-sleek-border rounded-3xl w-full max-w-4xl shadow-sleek-2xl overflow-hidden flex flex-col my-4 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-sleek-border flex items-center justify-between bg-gradient-to-r from-sleek-panel to-sleek-card">
          <div className="flex items-center gap-3">
            <div className="bg-sleek-accent/10 p-2 rounded-xl">
              <Trophy className="text-sleek-accent" size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-sleek-text text-lg">Express Match Setup</h3>
              <p className="text-xs text-sleek-text-muted">Smart defaults applied. Review and start playing.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sleek-overlay text-sleek-text-muted hover:text-sleek-text rounded-xl transition cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Steps Header */}
        <div className="bg-sleek-overlay px-6 py-2.5 border-b border-sleek-border flex items-center gap-6 text-xs font-black uppercase tracking-widest text-sleek-text-muted">
          <div className={`flex items-center gap-2 ${step === 'draft' ? 'text-sleek-accent' : 'text-emerald-400'}`}>
            <span>1. Confirm Lineups</span>
            {step === 'toss' && <CheckCircle2 size={14} className="text-emerald-400" />}
          </div>
          <ArrowRight size={14} />
          <div className={`flex items-center gap-2 ${step === 'toss' ? 'text-sleek-accent' : ''}`}>
            <span>2. Toss & Start</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 overflow-y-auto flex-1">
          {step === 'draft' && (
            <div className="space-y-6">
              
              {/* Top Config Row */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2 w-full">
                  <span className="text-[10px] text-sleek-text-muted font-black uppercase tracking-wider block">Match Format</span>
                  <div className="flex gap-2">
                    {[5, 6, 8].map(o => (
                      <button key={o} onClick={() => setOversCount(o)} className={`flex-1 py-2 text-xs font-black rounded-xl border transition cursor-pointer ${oversCount === o ? 'bg-sleek-accent border-sleek-accent text-black' : 'bg-sleek-overlay border-sleek-border text-sleek-text'}`}>
                        {o} Ov
                      </button>
                    ))}
                    <button onClick={() => setOversCount(0)} className={`flex-1 py-2 text-xs font-black rounded-xl border transition cursor-pointer ${oversCount === 0 ? 'bg-sleek-accent border-sleek-accent text-black' : 'bg-sleek-overlay border-sleek-border text-sleek-text'}`}>
                      Custom
                    </button>
                  </div>
                </div>
                {oversCount === 0 && (
                  <div className="w-24">
                    <input type="number" value={customOvers} onChange={e => setCustomOvers(e.target.value)} placeholder="Overs" className="w-full px-3 py-2 bg-sleek-panel text-sleek-text border border-sleek-border rounded-xl font-mono text-sm focus:ring-1 focus:ring-sleek-accent outline-none" />
                  </div>
                )}
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => setShowAttendance(!showAttendance)} className="px-4 py-2 bg-sleek-lightcard hover:bg-sleek-overlay border border-sleek-border rounded-xl text-xs font-black uppercase tracking-wider text-sleek-text transition flex items-center justify-center gap-2 flex-1 md:flex-none h-10 cursor-pointer">
                    <Users size={16} /> Manage Attendance ({localPlayers.filter(p=>p.available).length})
                  </button>
                  <button onClick={() => performAutoDraft(localPlayers, playerStats)} className="px-4 py-2 bg-sleek-accent/10 hover:bg-sleek-accent/20 border border-sleek-accent/30 rounded-xl text-xs font-black uppercase tracking-wider text-sleek-accent transition flex items-center justify-center gap-2 flex-1 md:flex-none h-10 cursor-pointer">
                    <Shuffle size={16} /> Auto-Draft
                  </button>
                </div>
              </div>

              {/* Attendance Drawer */}
              <AnimatePresence>
                {showAttendance && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 bg-sleek-panel border border-sleek-border rounded-2xl mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase text-sleek-text tracking-widest">Player Availability</span>
                        <button onClick={() => setShowAttendance(false)} className="text-xs text-sleek-text-muted hover:text-sleek-text font-bold cursor-pointer">Close</button>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {localPlayers.map(p => (
                          <button key={p.id} onClick={() => toggleAttendance(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition border flex items-center gap-2 cursor-pointer ${p.available ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                            <img src={p.avatar} alt="" className="w-4 h-4 rounded-full" />
                            {p.name} {p.available ? '✓' : '✗'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Double Sided Player Section */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {doubleSidedId ? (
                    <img src={getPlayerAvatar(doubleSidedId)} alt="" className="w-10 h-10 rounded-full border-2 border-amber-500" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-amber-500/50 border-dashed flex items-center justify-center text-amber-500/50 font-bold">?</div>
                  )}
                  <div>
                    <span className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={14}/> Double-Sided Player</span>
                    <span className="text-sleek-text text-sm font-bold block">{doubleSidedId ? getPlayerName(doubleSidedId) : 'None selected'}</span>
                  </div>
                </div>
                {doubleSidedId && (
                  <div className="flex gap-2">
                    <button onClick={() => moveToTeam(doubleSidedId, 'A')} className="text-[10px] text-amber-400 hover:text-emerald-400 font-black uppercase px-2 py-1 bg-black/20 rounded-lg cursor-pointer">To A</button>
                    <button onClick={() => moveToTeam(doubleSidedId, 'B')} className="text-[10px] text-amber-400 hover:text-emerald-400 font-black uppercase px-2 py-1 bg-black/20 rounded-lg cursor-pointer">To B</button>
                  </div>
                )}
              </div>

              {/* Smart Draft Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Team A */}
                <div onDragOver={(e) => { e.preventDefault(); setIsDragOverA(true); }} onDragLeave={() => setIsDragOverA(false)} onDrop={(e) => { e.preventDefault(); setIsDragOverA(false); moveToTeam(e.dataTransfer.getData('text/plain'), 'A'); }}
                  className={`bg-sleek-card border rounded-2xl p-4 flex flex-col gap-3 transition-all ${isDragOverA ? 'border-sleek-accent scale-[1.02]' : 'border-sleek-border'}`}>
                  <div className="flex items-center justify-between border-b border-sleek-border pb-3">
                    <div className="flex items-center gap-2 w-full">
                      <input type="text" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} className="bg-transparent font-black text-sleek-accent text-sm uppercase tracking-widest w-full outline-none focus:border-b focus:border-sleek-accent" />
                    </div>
                    <span className="px-2 py-1 bg-sleek-overlay text-sleek-text-muted font-mono text-xs rounded-lg">{teamAPlayers.length}</span>
                  </div>
                  <select value={captainA} onChange={(e) => setCaptainA(e.target.value)} className="text-xs bg-sleek-panel border border-sleek-border text-sleek-text px-3 py-2 rounded-xl focus:outline-none focus:border-sleek-accent font-bold uppercase cursor-pointer">
                    {teamAPlayers.map(id => <option key={id} value={id}>{getPlayerName(id)} (Captain)</option>)}
                  </select>
                  <div className="space-y-2 min-h-[150px]">
                    {teamAPlayers.map(id => (
                      <div key={id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }} className="flex items-center gap-3 p-2 bg-sleek-overlay border border-sleek-border rounded-xl cursor-grab active:cursor-grabbing hover:border-sleek-accent/50">
                        <img src={getPlayerAvatar(id)} alt="" className="w-8 h-8 rounded-full bg-sleek-panel" />
                        <span className="font-bold text-sleek-text text-sm truncate flex-1">{getPlayerName(id)}</span>
                        <div className="flex gap-1">
                          <button onClick={() => moveToTeam(id, 'DS')} className="text-[10px] text-sleek-text-muted hover:text-amber-400 font-black uppercase px-2 py-1 bg-sleek-panel rounded-lg cursor-pointer" title="Make Double-Sided">DS</button>
                          <button onClick={() => moveToTeam(id, 'B')} className="text-[10px] text-sleek-text-muted hover:text-emerald-400 font-black uppercase px-2 py-1 bg-sleek-panel rounded-lg cursor-pointer" title="Move to Team B">&rarr;</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team B */}
                <div onDragOver={(e) => { e.preventDefault(); setIsDragOverB(true); }} onDragLeave={() => setIsDragOverB(false)} onDrop={(e) => { e.preventDefault(); setIsDragOverB(false); moveToTeam(e.dataTransfer.getData('text/plain'), 'B'); }}
                  className={`bg-sleek-card border rounded-2xl p-4 flex flex-col gap-3 transition-all ${isDragOverB ? 'border-emerald-400 scale-[1.02]' : 'border-sleek-border'}`}>
                  <div className="flex items-center justify-between border-b border-sleek-border pb-3">
                    <div className="flex items-center gap-2 w-full">
                      <input type="text" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} className="bg-transparent font-black text-emerald-400 text-sm uppercase tracking-widest w-full outline-none focus:border-b focus:border-emerald-400" />
                    </div>
                    <span className="px-2 py-1 bg-sleek-overlay text-sleek-text-muted font-mono text-xs rounded-lg">{teamBPlayers.length}</span>
                  </div>
                  <select value={captainB} onChange={(e) => setCaptainB(e.target.value)} className="text-xs bg-sleek-panel border border-sleek-border text-sleek-text px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-400 font-bold uppercase cursor-pointer">
                    {teamBPlayers.map(id => <option key={id} value={id}>{getPlayerName(id)} (Captain)</option>)}
                  </select>
                  <div className="space-y-2 min-h-[150px]">
                    {teamBPlayers.map(id => (
                      <div key={id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }} className="flex items-center gap-3 p-2 bg-sleek-overlay border border-sleek-border rounded-xl cursor-grab active:cursor-grabbing hover:border-emerald-400/50">
                        <div className="flex gap-1">
                          <button onClick={() => moveToTeam(id, 'A')} className="text-[10px] text-sleek-text-muted hover:text-sleek-accent font-black uppercase px-2 py-1 bg-sleek-panel rounded-lg cursor-pointer" title="Move to Team A">&larr;</button>
                          <button onClick={() => moveToTeam(id, 'DS')} className="text-[10px] text-sleek-text-muted hover:text-amber-400 font-black uppercase px-2 py-1 bg-sleek-panel rounded-lg cursor-pointer" title="Make Double-Sided">DS</button>
                        </div>
                        <span className="font-bold text-sleek-text text-sm truncate flex-1 text-right">{getPlayerName(id)}</span>
                        <img src={getPlayerAvatar(id)} alt="" className="w-8 h-8 rounded-full bg-sleek-panel" />
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center pt-4 border-t border-sleek-border">
                <span className={`text-xs font-bold uppercase ${isBalanced ? 'text-emerald-500' : 'text-amber-500'}`}>{isBalanced ? '✓ Teams Balanced' : '⚠️ Teams Unbalanced'}</span>
                <button onClick={() => setStep('toss')} disabled={!isBalanced || !captainA || !captainB} className="px-6 py-3 bg-sleek-accent text-black hover:bg-sleek-accent/90 disabled:bg-sleek-overlay disabled:text-sleek-text-muted font-black uppercase text-xs tracking-widest rounded-xl transition flex items-center gap-2 cursor-pointer">
                  Confirm Lineups <ArrowRight size={16} />
                </button>
              </div>

            </div>
          )}

          {step === 'toss' && (
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="text-center space-y-2 pb-4">
                <Coins className="mx-auto text-yellow-500" size={48} />
                <h4 className="font-extrabold text-sleek-text text-xl uppercase tracking-wider">Toss Details</h4>
                <p className="text-sm text-sleek-text-muted">Enter physical coin toss results, or let the app flip it.</p>
              </div>

              <div className="bg-sleek-card border border-sleek-border p-6 rounded-3xl space-y-8">
                
                {/* Winner Toggle */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block text-center">Who won the toss?</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTossWinner('teamA')} className={`py-4 px-4 rounded-2xl border-2 font-black uppercase tracking-wider transition cursor-pointer ${tossWinner === 'teamA' ? 'bg-sleek-accent/10 border-sleek-accent text-sleek-accent shadow-[0_0_15px_rgba(0,229,255,0.2)]' : 'bg-sleek-overlay border-transparent text-sleek-text hover:bg-sleek-lightcard'}`}>
                      {teamAName}
                    </button>
                    <button onClick={() => setTossWinner('teamB')} className={`py-4 px-4 rounded-2xl border-2 font-black uppercase tracking-wider transition cursor-pointer ${tossWinner === 'teamB' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-sleek-overlay border-transparent text-sleek-text hover:bg-sleek-lightcard'}`}>
                      {teamBName}
                    </button>
                  </div>
                </div>

                {/* Decision Toggle */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block text-center">What did they elect to do?</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setTossDecision('bat')} className={`py-4 px-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition cursor-pointer ${tossDecision === 'bat' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-sleek-overlay border-transparent text-sleek-text hover:bg-sleek-lightcard'}`}>
                      <span className="text-2xl">🏸</span>
                      <span className="font-black uppercase tracking-wider text-sm">Bat</span>
                    </button>
                    <button onClick={() => setTossDecision('bowl')} className={`py-4 px-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition cursor-pointer ${tossDecision === 'bowl' ? 'bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-sleek-overlay border-transparent text-sleek-text hover:bg-sleek-lightcard'}`}>
                      <span className="text-2xl">🥎</span>
                      <span className="font-black uppercase tracking-wider text-sm">Bowl</span>
                    </button>
                  </div>
                </div>

                {/* Digital Toss Overide */}
                <div className="pt-6 border-t border-sleek-border flex justify-center">
                   <button onClick={handleDigitalToss} className="flex items-center gap-2 px-4 py-2 bg-sleek-panel border border-sleek-border hover:border-sleek-text rounded-xl text-xs font-black text-sleek-text uppercase tracking-wider transition cursor-pointer">
                     <Shuffle size={14} /> Let App Flip For Us
                   </button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setStep('draft')} className="px-5 py-2.5 hover:bg-sleek-overlay text-sleek-text font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer">
                  Back
                </button>
                <button onClick={handleFinalizeMatch} disabled={!tossWinner || !tossDecision || saving} className="px-6 py-3 bg-sleek-accent text-black hover:bg-sleek-accent/90 disabled:bg-sleek-overlay disabled:text-sleek-text-muted font-black uppercase text-xs tracking-widest rounded-xl transition flex items-center gap-2 cursor-pointer">
                  {saving ? 'Initializing...' : 'Start Match Scoring'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
