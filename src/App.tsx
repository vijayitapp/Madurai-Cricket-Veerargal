import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Player, PlayerStats, Match } from './types';

// Subcomponents
import PlayerManager from './components/PlayerManager';
import TeamGenerator from './components/TeamGenerator';
import ScoringInterface from './components/ScoringInterface';
import LiveDashboard from './components/LiveDashboard';
import HomeDashboard from './components/HomeDashboard';
import StatsAnalytics from './components/StatsAnalytics';
import MatchHistory from './components/MatchHistory';
import Leaderboard from './components/Leaderboard';
import NewMatchSetupModal from './components/NewMatchSetupModal';
// Icons
import { Trophy, Users, Award, Calendar, Activity, Zap, Shield, LogIn, LogOut, Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Firestore Data State
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<string>('live');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [squadSubTab, setSquadSubTab] = useState<'players' | 'teams'>('players');
  const [statsSubTab, setStatsSubTab] = useState<'leaderboard' | 'analytics'>('leaderboard');

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsAdminMode(true); // Sign in automatically grants scorer capabilities
      } else {
        setIsAdminMode(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to players collection
  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Player[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Player);
      });
      setPlayers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'players');
    });
    return () => unsubscribe();
  }, []);

  // Listen to player stats collection
  useEffect(() => {
    const q = collection(db, 'player_stats');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PlayerStats[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as PlayerStats);
      });
      setPlayerStats(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'player_stats');
    });
    return () => unsubscribe();
  }, []);

  // Listen to matches collection
  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Match[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Match);
      });
      setMatches(list);

      // Identify active match (status === 'scoring')
      const active = list.find(m => m.status === 'scoring');
      setActiveMatch(active || null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Auth error:", err);
      // Fallback/Simulation for sandbox
      setIsAdminMode(true);
      alert('Mock Login Activated: Scorer/Admin roles granted (Sandbox mode)');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdminMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceAdminMode = () => {
    setIsAdminMode(!isAdminMode);
  };

  const forceRefresh = () => {
    // Refresh triggered
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sleek-bg flex flex-col items-center justify-center p-4 text-sleek-text">
        <Loader2 className="w-8 h-8 text-sleek-accent animate-spin" />
        <p className="mt-3 text-xs text-white/50 font-medium">Loading Madurai Cricket Veeragal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sleek-bg text-sleek-text flex flex-col font-sans select-none pb-24 lg:pb-0">
      
      {/* Top Banner Header */}
      <header className="bg-sleek-panel border-b border-sleek-border px-8 py-4 sticky top-0 z-40 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#A3FF12] rounded-lg flex items-center justify-center shadow-md shadow-[#A3FF12]/10">
            <div className="w-4 h-4 bg-[#0A0C10] rotate-45"></div>
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight leading-none italic underline decoration-sleek-accent decoration-4 underline-offset-4 uppercase">Madurai Veeragal</h1>
            <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1.5 block">Neighborhood League</span>
          </div>
        </div>

        {/* Auth / Role Switcher */}
        <div className="flex items-center gap-2">
          {/* Sandbox toggle */}
          <button
            onClick={handleForceAdminMode}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border transition cursor-pointer ${
              isAdminMode
                ? 'bg-sleek-accent/10 border-sleek-accent/30 text-sleek-accent hover:bg-sleek-accent/20'
                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            <Shield size={12} />
            {isAdminMode ? 'Admin/Scorer' : 'Viewer'}
          </button>

          {user ? (
            <button
              onClick={handleLogout}
              className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
              title="Sign In with Google"
            >
              <LogIn size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content View Frame */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6 mb-16">
        
        {/* Render Tab Content */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {activeMatch ? (
              <LiveDashboard match={activeMatch} players={players} />
            ) : (
              <HomeDashboard
                matches={matches}
                playerStats={playerStats}
                players={players}
                isAdminMode={isAdminMode}
                onStartMatch={() => setIsSetupModalOpen(true)}
                onNavigateToTab={(tab) => {
                  if (tab === 'leaderboard') {
                    setActiveTab('stats');
                    setStatsSubTab('leaderboard');
                  } else if (tab === 'analytics') {
                    setActiveTab('stats');
                    setStatsSubTab('analytics');
                  } else if (tab === 'players') {
                    setActiveTab('squads');
                    setSquadSubTab('players');
                  } else if (tab === 'teams') {
                    setActiveTab('squads');
                    setSquadSubTab('teams');
                  } else {
                    setActiveTab(tab);
                  }
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'scoring' && (
          <div className="space-y-6">
            {activeMatch ? (
              <ScoringInterface match={activeMatch} players={players} onRefresh={forceRefresh} />
            ) : (
              <div className="bg-sleek-card border border-sleek-border p-8 rounded-3xl text-center space-y-4 shadow-xl max-w-md mx-auto">
                <div className="w-16 h-16 bg-white/5 text-sleek-accent rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Trophy size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-white text-base">Ready to Score?</h3>
                  <p className="text-xs text-white/50">
                    Initialize a balanced teams match with captains, toss details, and custom overs configuration to begin scoring!
                  </p>
                </div>
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-sleek-accent hover:bg-sleek-accent/80 text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Sparkles size={14} fill="currentColor" /> Start Match Setup Flow
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'squads' && (
          <div className="space-y-6">
            {/* Elegant Sub-navigation for Squads */}
            <div className="flex bg-[#11141D] p-1 rounded-2xl border border-white/5 max-w-sm mx-auto">
              <button
                onClick={() => setSquadSubTab('players')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  squadSubTab === 'players'
                    ? 'bg-[#A3FF12] text-black shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Manage Players
              </button>
              <button
                onClick={() => setSquadSubTab('teams')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  squadSubTab === 'teams'
                    ? 'bg-[#A3FF12] text-black shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Team Generator
              </button>
            </div>

            {squadSubTab === 'players' ? (
              <PlayerManager players={players} playerStats={playerStats} loading={players.length === 0} onRefresh={forceRefresh} />
            ) : (
              <TeamGenerator players={players} playerStats={playerStats} onMatchCreated={(id) => {
                setActiveTab('scoring');
              }} />
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Elegant Sub-navigation for Stats */}
            <div className="flex bg-[#11141D] p-1 rounded-2xl border border-white/5 max-w-sm mx-auto">
              <button
                onClick={() => setStatsSubTab('leaderboard')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  statsSubTab === 'leaderboard'
                    ? 'bg-[#A3FF12] text-black shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Stars Leaderboard
              </button>
              <button
                onClick={() => setStatsSubTab('analytics')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  statsSubTab === 'analytics'
                    ? 'bg-[#A3FF12] text-black shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Career Analytics
              </button>
            </div>

            {statsSubTab === 'leaderboard' ? (
              <Leaderboard playerStats={playerStats} />
            ) : (
              <StatsAnalytics players={players} playerStats={playerStats} />
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <MatchHistory
            matches={matches}
            players={players}
            onRefresh={forceRefresh}
            isAdminMode={isAdminMode}
            onResumeMatch={(matchId) => {
              setActiveTab('scoring');
            }}
          />
        )}



      </main>

      {/* Bottom Floating Nav Bar (Mobile-first, floating container styled with premium glassmorphism) */}
      <nav className="bg-sleek-panel/95 backdrop-blur-md border border-white/5 fixed bottom-0 left-0 right-0 z-40 px-4 py-2.5 shadow-2xl flex items-center justify-around max-w-lg mx-auto md:bottom-4 md:rounded-3xl md:border">
        
        {/* Live */}
        <button
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'live' ? 'text-[#A3FF12] font-black scale-105' : 'text-white/40 hover:text-white'
          }`}
        >
          <Activity size={18} className={activeTab === 'live' ? 'animate-pulse text-[#A3FF12]' : ''} />
          <span className="text-[10px] mt-1 font-bold tracking-tight uppercase">Live</span>
        </button>

        {/* Squads (Grouped: Players & Teams) */}
        <button
          onClick={() => {
            setActiveTab('squads');
          }}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'squads' ? 'text-[#A3FF12] font-black scale-105' : 'text-white/40 hover:text-white'
          }`}
        >
          <Users size={18} />
          <span className="text-[10px] mt-1 font-bold tracking-tight uppercase">Squads</span>
        </button>

        {/* Prominent Scorer (Trophy) Centerpiece - Admin Only */}
        {isAdminMode && (
          <button
            onClick={() => setActiveTab('scoring')}
            className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl transition cursor-pointer relative -top-3 shadow-lg ${
              activeTab === 'scoring'
                ? 'bg-[#A3FF12] text-black font-black scale-110 shadow-[#A3FF12]/20 border border-[#A3FF12]'
                : 'bg-[#161B26] border border-white/10 text-[#A3FF12] hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={18} className={activeTab === 'scoring' ? 'text-black' : 'text-[#A3FF12]'} />
            <span className="text-[9px] mt-1 uppercase font-black tracking-wider">Scorer</span>
          </button>
        )}

        {/* Leaderboard (Grouped: Stars & Analytics) */}
        <button
          onClick={() => {
            setActiveTab('stats');
          }}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'stats' ? 'text-[#A3FF12] font-black scale-105' : 'text-white/40 hover:text-white'
          }`}
        >
          <Award size={18} />
          <span className="text-[10px] mt-1 font-bold tracking-tight uppercase">Stars</span>
        </button>

        {/* History / Archive */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'history' ? 'text-[#A3FF12] font-black scale-105' : 'text-white/40 hover:text-white'
          }`}
        >
          <Calendar size={18} />
          <span className="text-[10px] mt-1 font-bold tracking-tight uppercase">History</span>
        </button>

      </nav>

      <NewMatchSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        players={players}
        playerStats={playerStats}
        onMatchCreated={(matchId) => {
          setActiveTab('scoring');
          forceRefresh();
        }}
      />
    </div>
  );
}
