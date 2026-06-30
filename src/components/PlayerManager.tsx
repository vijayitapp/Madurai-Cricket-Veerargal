import React, { useState } from 'react';
import { Player, PlayerStats } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { generateDefaultPlayers, generateDefaultStats } from '../data/defaultPlayers';
import { Plus, Trash2, CheckCircle2, XCircle, Users, RefreshCw, Smartphone, Sparkles } from 'lucide-react';

interface PlayerManagerProps {
  players: Player[];
  playerStats: PlayerStats[];
  loading: boolean;
  onRefresh: () => void;
}

export default function PlayerManager({ players, playerStats, loading, onRefresh }: PlayerManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerMobile, setNewPlayerMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setSaving(true);
    const id = `player_${Date.now()}`;
    const newPlayer: Player = {
      id,
      name: newPlayerName.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newPlayerName)}`,
      available: true,
      attendance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (newPlayerMobile.trim()) {
      newPlayer.mobile = newPlayerMobile.trim();
    }

    try {
      await setDoc(doc(db, 'players', id), newPlayer);
      
      // Also initialize empty stats for the player
      const initialStats: PlayerStats = {
        id,
        name: newPlayer.name,
        matchesPlayed: 0,
        batting: { innings: 0, runs: 0, highestScore: 0, average: 0, strikeRate: 0, thirtyPlus: 0, fiftyPlus: 0, ballsFaced: 0, dismissals: 0 },
        bowling: { innings: 0, wickets: 0, runsConceded: 0, oversBowled: 0, economy: 0, average: 0, bestWickets: 0, bestRuns: 0 },
        fielding: { catches: 0, runOuts: 0, stumpings: 0 },
        awards: { potm: 0, bestBatter: 0, bestBowler: 0, mvp: 0, mvpPoints: 0 }
      };
      await setDoc(doc(db, 'player_stats', id), initialStats);

      setNewPlayerName('');
      setNewPlayerMobile('');
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `players/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (player: Player) => {
    const updatedVal = !player.available;
    try {
      await updateDoc(doc(db, 'players', player.id), {
        available: updatedVal,
        updatedAt: new Date().toISOString(),
      });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `players/${player.id}`);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    try {
      await deleteDoc(doc(db, 'players', playerId));
      await deleteDoc(doc(db, 'player_stats', playerId));
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `players/${playerId}`);
    }
  };

  const handleSeedData = async () => {
    setSaving(true);
    try {
      const demoPlayers = generateDefaultPlayers();
      const demoStats = generateDefaultStats(demoPlayers);

      // Write players in parallel
      await Promise.all(
        demoPlayers.map(p => setDoc(doc(db, 'players', p.id), p))
      );

      // Write stats in parallel
      await Promise.all(
        demoStats.map(s => setDoc(doc(db, 'player_stats', s.id), s))
      );

      alert('Successfully seeded 25 regular Madurai players with mock career stats!');
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'players_seed');
    } finally {
      setSaving(false);
    }
  };

  const availableCount = players.filter(p => p.available).length;

  return (
    <div className="space-y-6">
      {/* Overview & Quick Seeding */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-sleek-panel border border-sleek-border p-5 rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sleek-overlay text-sleek-accent rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-sleek-accent uppercase tracking-wider text-sm">Community Squad</h3>
            <p className="text-xs text-sleek-text-muted mt-0.5">
              {players.length} Players Registered &bull; <strong className="text-sleek-accent font-black">{availableCount} Available</strong> for next match
            </p>
          </div>
        </div>
        
        {players.length === 0 && (
          <button
            onClick={handleSeedData}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2.5 bg-sleek-overlay border border-sleek-border text-sleek-text hover:bg-sleek-accent hover:text-black hover:border-transparent text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            {saving ? 'Seeding...' : 'Seed 25 Demo Players'}
          </button>
        )}
      </div>

      {/* Add New Player Form */}
      <form onSubmit={handleAddPlayer} className="bg-sleek-card p-5 border border-sleek-border rounded-2xl shadow-sleek-xl space-y-4">
        <h4 className="font-extrabold text-sleek-text text-sm uppercase tracking-wider">Register New Player</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Player Full Name (e.g., Alagar)"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            required
            disabled={saving}
            className="px-4 py-2.5 bg-sleek-overlay text-sleek-text placeholder-white/30 border border-sleek-border rounded-xl focus:outline-none focus:ring-1 focus:ring-sleek-accent text-sm font-mono"
          />
          <input
            type="tel"
            placeholder="Mobile Number (Optional)"
            value={newPlayerMobile}
            onChange={(e) => setNewPlayerMobile(e.target.value)}
            disabled={saving}
            className="px-4 py-2.5 bg-sleek-overlay text-sleek-text placeholder-white/30 border border-sleek-border rounded-xl focus:outline-none focus:ring-1 focus:ring-sleek-accent text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !newPlayerName.trim()}
          className="w-full py-2.5 bg-sleek-accent text-black font-black uppercase tracking-wider rounded-xl hover:bg-sleek-accent/80 transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
        >
          <Plus size={16} />
          {saving ? 'Registering...' : 'Register Player'}
        </button>
      </form>

      {/* Player List */}
      <div className="bg-sleek-card border border-sleek-border rounded-2xl shadow-sleek-xl overflow-hidden">
        <div className="p-4 border-b border-sleek-border flex items-center justify-between bg-sleek-panel">
          <h4 className="font-extrabold text-sleek-accent uppercase tracking-wider text-sm">Player Roster</h4>
          <button 
            onClick={onRefresh}
            className="p-1.5 text-sleek-text-muted hover:text-sleek-text rounded-lg transition"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sleek-text-muted text-sm">Loading players list...</div>
        ) : players.length === 0 ? (
          <div className="p-12 text-center text-sleek-text-muted space-y-3">
            <p className="text-sm font-semibold">No players registered yet.</p>
            <p className="text-xs text-sleek-text-muted">Add players manually above, or click the "Seed" button to populate some local superstars instantly!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[450px] overflow-y-auto">
            {players.map((player) => (
              <div key={player.id} className="p-4 flex items-center justify-between hover:bg-sleek-overlay transition">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.name}`}
                    alt={player.name}
                    className="w-9 h-9 rounded-xl bg-sleek-overlay border border-sleek-border p-1 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <p className="font-extrabold text-sleek-text text-sm truncate">{player.name}</p>
                    <div className="flex items-center gap-2 text-xs text-sleek-text-muted font-mono">
                      {player.mobile && (
                        <span className="flex items-center gap-0.5">
                          <Smartphone size={10} /> {player.mobile}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span>{player.attendance} Matches Played</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleAvailability(player)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 border transition cursor-pointer ${
                      player.available
                        ? 'bg-sleek-accent/10 border-sleek-accent/20 text-sleek-accent hover:bg-sleek-accent/20'
                        : 'bg-sleek-overlay border-sleek-border text-sleek-text-muted hover:bg-sleek-overlay-hover'
                    }`}
                  >
                    {player.available ? (
                      <>
                        <CheckCircle2 size={12} className="text-sleek-accent" />
                        Available
                      </>
                    ) : (
                      <>
                        <XCircle size={12} className="text-sleek-text-muted" />
                        Unavailable
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(player.id)}
                    className="p-1.5 text-sleek-text/20 hover:text-rose-500 rounded-lg transition hover:bg-rose-500/10 cursor-pointer"
                    title="Delete player"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-sleek-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-extrabold text-sleek-text text-base uppercase tracking-wider">Delete Player?</h4>
              <p className="text-xs text-sleek-text-muted leading-relaxed">
                Are you sure you want to delete <strong>{players.find(p => p.id === deleteConfirmId)?.name || 'this player'}</strong>? This will permanently remove their profile and all historic stats.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePlayer(deleteConfirmId)}
                className="py-2.5 bg-rose-500 hover:bg-rose-600 text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
