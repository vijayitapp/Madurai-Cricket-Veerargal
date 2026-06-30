import React, { useState } from 'react';
import { Match, Player } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, AlertTriangle, Users, PlusCircle } from 'lucide-react';

interface ManageTeamsModalProps {
  match: Match;
  players: Player[];
  onClose: () => void;
  onRefresh: () => void;
}

export function ManageTeamsModal({ match, players, onClose, onRefresh }: ManageTeamsModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for edits
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([...match.teamA.players]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([...match.teamB.players]);
  const [doubleSidedId, setDoubleSidedId] = useState<string | null>(match.doubleSidedPlayerId || null);

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';
  const getPlayerAvatar = (id: string) => players.find(p => p.id === id)?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`;

  const hasParticipated = (id: string) => {
    if (id === match.currentBatter1Id || id === match.currentBatter2Id || id === match.currentBowlerId) return true;
    for (const event of match.timeline) {
      if (event.batterId === id || event.bowlerId === id) return true;
    }
    return false;
  };

  const handleMove = (playerId: string, target: 'A' | 'B' | 'DS') => {
    if (hasParticipated(playerId)) {
      setError(`Cannot move ${getPlayerName(playerId)} because they have already participated in this match.`);
      return;
    }

    setTeamAPlayers(prev => prev.filter(id => id !== playerId));
    setTeamBPlayers(prev => prev.filter(id => id !== playerId));
    if (doubleSidedId === playerId) setDoubleSidedId(null);

    if (target === 'A') {
      setTeamAPlayers(prev => [...prev, playerId]);
    } else if (target === 'B') {
      setTeamBPlayers(prev => [...prev, playerId]);
    } else if (target === 'DS') {
      setDoubleSidedId(playerId);
    }
    setError(null);
  };

  const availableToAdd = players.filter(p => p.available && !teamAPlayers.includes(p.id) && !teamBPlayers.includes(p.id) && p.id !== doubleSidedId);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // We must preserve existing match state structure while updating the players lists.
      // Note: We are just updating the 'players' array. The 'score.batting' and 'score.bowling' 
      // arrays do not strictly need the new player right away, as our processBall 
      // logic handles missing stats gracefully. But let's add them just to be safe if they are new.

      const matchRef = doc(db, 'matches', match.id);
      await updateDoc(matchRef, {
        'teamA.players': teamAPlayers,
        'teamB.players': teamBPlayers,
        doubleSidedPlayerId: doubleSidedId || null,
        updatedAt: new Date().toISOString()
      });

      onRefresh();
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
      setError('Failed to update teams. Check console for details.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-sleek-panel border border-sleek-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-sleek-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-sleek-border flex items-center justify-between bg-sleek-overlay shrink-0">
          <div>
            <h3 className="font-black text-sleek-text text-lg uppercase tracking-wider flex items-center gap-2">
              <Users className="text-emerald-400" /> Manage Teams
            </h3>
            <p className="text-xs text-sleek-text-muted mt-1 font-medium">Add new players or move unused players mid-match.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sleek-overlay-hover rounded-xl transition cursor-pointer text-sleek-text-muted hover:text-sleek-text">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="text-rose-500" size={18} />
              <p className="text-xs font-bold text-rose-400">{error}</p>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                {doubleSidedId ? (
                   <img src={getPlayerAvatar(doubleSidedId)} className="w-12 h-12 rounded-full border-2 border-amber-500" alt="" />
                ) : (
                   <div className="w-12 h-12 rounded-full border-2 border-amber-500/50 border-dashed flex items-center justify-center text-amber-500/50 text-xl font-bold">?</div>
                )}
                <div>
                   <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14}/> Double-Sided Player</h4>
                   <p className="text-sm font-bold text-sleek-text mt-1">{doubleSidedId ? getPlayerName(doubleSidedId) : 'None assigned'}</p>
                </div>
             </div>
             {doubleSidedId && (
                <div className="flex gap-2 shrink-0">
                   {!hasParticipated(doubleSidedId) ? (
                      <>
                         <button onClick={() => handleMove(doubleSidedId, 'A')} className="px-3 py-1.5 text-[10px] font-black uppercase text-amber-400 hover:text-emerald-400 bg-black/20 hover:bg-black/40 rounded-lg transition cursor-pointer">Move to A</button>
                         <button onClick={() => handleMove(doubleSidedId, 'B')} className="px-3 py-1.5 text-[10px] font-black uppercase text-amber-400 hover:text-emerald-400 bg-black/20 hover:bg-black/40 rounded-lg transition cursor-pointer">Move to B</button>
                      </>
                   ) : (
                      <span className="text-[10px] uppercase font-bold text-amber-500/50 px-2 py-1 bg-black/20 rounded-lg">Active in Match</span>
                   )}
                </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Team A */}
            <div className="bg-sleek-card border border-sleek-border rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-sleek-border pb-3">
                <span className="font-black text-sleek-accent text-sm uppercase tracking-widest truncate">{match.teamA.name}</span>
                <span className="px-2 py-1 bg-sleek-overlay text-sleek-text-muted font-mono text-xs rounded-lg">{teamAPlayers.length}</span>
              </div>
              <div className="space-y-2">
                {teamAPlayers.map(id => {
                  const active = hasParticipated(id);
                  return (
                    <div key={id} className="flex items-center gap-3 p-2 bg-sleek-overlay border border-sleek-border rounded-xl">
                      <img src={getPlayerAvatar(id)} alt="" className="w-8 h-8 rounded-full bg-sleek-panel" />
                      <span className="font-bold text-sleek-text text-sm truncate flex-1">{getPlayerName(id)}</span>
                      <div className="flex gap-1 shrink-0">
                        {!active ? (
                          <>
                            <button onClick={() => handleMove(id, 'DS')} className="text-[10px] text-sleek-text-muted hover:text-amber-400 font-black uppercase px-2 py-1 bg-sleek-panel hover:bg-sleek-panel/80 rounded-lg cursor-pointer transition">DS</button>
                            <button onClick={() => handleMove(id, 'B')} className="text-[10px] text-sleek-text-muted hover:text-emerald-400 font-black uppercase px-2 py-1 bg-sleek-panel hover:bg-sleek-panel/80 rounded-lg cursor-pointer transition">&rarr; B</button>
                          </>
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-emerald-500/50 px-2 py-1 bg-sleek-panel rounded-lg flex items-center">Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-sleek-card border border-sleek-border rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-sleek-border pb-3">
                <span className="font-black text-emerald-400 text-sm uppercase tracking-widest truncate">{match.teamB.name}</span>
                <span className="px-2 py-1 bg-sleek-overlay text-sleek-text-muted font-mono text-xs rounded-lg">{teamBPlayers.length}</span>
              </div>
              <div className="space-y-2">
                {teamBPlayers.map(id => {
                  const active = hasParticipated(id);
                  return (
                    <div key={id} className="flex items-center gap-3 p-2 bg-sleek-overlay border border-sleek-border rounded-xl">
                      <div className="flex gap-1 shrink-0">
                        {!active ? (
                          <>
                            <button onClick={() => handleMove(id, 'A')} className="text-[10px] text-sleek-text-muted hover:text-sleek-accent font-black uppercase px-2 py-1 bg-sleek-panel hover:bg-sleek-panel/80 rounded-lg cursor-pointer transition">A &larr;</button>
                            <button onClick={() => handleMove(id, 'DS')} className="text-[10px] text-sleek-text-muted hover:text-amber-400 font-black uppercase px-2 py-1 bg-sleek-panel hover:bg-sleek-panel/80 rounded-lg cursor-pointer transition">DS</button>
                          </>
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-emerald-500/50 px-2 py-1 bg-sleek-panel rounded-lg flex items-center">Active</span>
                        )}
                      </div>
                      <span className="font-bold text-sleek-text text-sm truncate flex-1 text-right">{getPlayerName(id)}</span>
                      <img src={getPlayerAvatar(id)} alt="" className="w-8 h-8 rounded-full bg-sleek-panel" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Add New Player */}
          {availableToAdd.length > 0 && (
             <div className="border border-sleek-border border-dashed rounded-2xl p-4 bg-sleek-overlay/50">
               <h4 className="text-xs font-black text-sleek-text-muted uppercase tracking-widest mb-3 flex items-center gap-2"><PlusCircle size={14}/> Add Player to Match</h4>
               <div className="flex flex-wrap gap-2">
                 {availableToAdd.map(p => (
                   <div key={p.id} className="flex items-center gap-2 bg-sleek-panel border border-sleek-border p-1.5 rounded-xl pr-3">
                     <img src={p.avatar} className="w-6 h-6 rounded-full" alt="" />
                     <span className="text-xs font-bold text-sleek-text">{p.name}</span>
                     <div className="flex items-center gap-1 ml-2 border-l border-sleek-border pl-2">
                       <button onClick={() => handleMove(p.id, 'A')} className="text-[9px] font-black uppercase text-sleek-text-muted hover:text-sleek-accent cursor-pointer transition">A</button>
                       <button onClick={() => handleMove(p.id, 'B')} className="text-[9px] font-black uppercase text-sleek-text-muted hover:text-emerald-400 cursor-pointer transition">B</button>
                       {!doubleSidedId && (
                          <button onClick={() => handleMove(p.id, 'DS')} className="text-[9px] font-black uppercase text-sleek-text-muted hover:text-amber-400 cursor-pointer transition">DS</button>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-sleek-border bg-sleek-overlay shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-transparent text-sleek-text-muted hover:text-sleek-text text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save Lineups'}
          </button>
        </div>
      </div>
    </div>
  );
}
