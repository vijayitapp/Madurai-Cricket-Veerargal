import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useAppStore } from './store';
import { useAuthRole } from './hooks/useAuthRole';

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
import { FullScorecardModal } from './components/FullScorecardModal';
import RoleSelectionScreen from './components/RoleSelectionScreen';
// Icons
import { Trophy, Users, Award, Calendar, Activity, Zap, Shield, LogOut, Loader2, Sparkles, Sun, Moon } from 'lucide-react';

export default function App() {
  const { role, setRole } = useAuthRole();
  const isAdminMode = role === 'admin' || role === 'scorer';
  const [loading, setLoading] = useState<boolean>(false);
  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'light';
  });

  // Toggle light class on documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (isLightTheme) {
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLightTheme]);

  // Zustand Global State
  const { players, playerStats, matches, activeMatch, loadingData, initStore } = useAppStore();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<string>('live');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [squadSubTab, setSquadSubTab] = useState<'players' | 'teams'>('players');
  const [statsSubTab, setStatsSubTab] = useState<'leaderboard' | 'analytics'>('leaderboard');
  const [viewingMatchId, setViewingMatchId] = useState<string | null>(null);

  // Initialize global data store
  useEffect(() => {
    const unsubscribe = initStore();
    return () => unsubscribe();
  }, [initStore]);

  const forceRefresh = () => {
    // Refresh triggered
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-sleek-bg flex flex-col items-center justify-center p-4 text-sleek-text">
        <Loader2 className="w-8 h-8 text-sleek-accent animate-spin" />
        <p className="mt-3 text-xs text-sleek-text-muted font-medium">Loading Madurai Cricket Veeragal...</p>
      </div>
    );
  }

  if (!role) {
    return <RoleSelectionScreen onSelectRole={setRole} />;
  }

  return (
    <div className="min-h-screen bg-sleek-bg text-sleek-text flex flex-col font-sans select-none pb-24 lg:pb-0">
      
      {/* Top Banner Header */}
      <header className="bg-sleek-panel border-b border-sleek-border px-4 md:px-8 py-3 md:py-4 sticky top-0 z-40 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 flex-shrink min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-sleek-accent rounded-lg flex items-center justify-center shadow-md shadow-sleek-accent/10 flex-shrink-0">
            <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-sleek-bg rotate-45"></div>
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-[11px] sm:text-sm text-sleek-text tracking-tight leading-tight italic uppercase truncate">
              MADURAI CRICKET <span className="text-sleek-accent">VEERARGAL</span>
            </h1>
          </div>
        </div>

        {/* Auth / Role Switcher */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsLightTheme(!isLightTheme)}
            className="p-1.5 rounded-xl border border-sleek-border bg-sleek-lightcard text-sleek-text hover:text-sleek-text transition cursor-pointer flex items-center justify-center"
            title={isLightTheme ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLightTheme ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Role Indicator / Switch Role */}
          <div className="flex items-center gap-1">
            <div className={`px-2 py-1.5 md:px-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1 border ${
              role === 'admin'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : role === 'scorer'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-sleek-overlay border-sleek-border text-sleek-text-muted'
            }`}>
              {role === 'admin' && <Shield size={12} />}
              {role === 'scorer' && <Award size={12} />}
              {role === 'player' && <Users size={12} />}
              <span className="hidden sm:inline">{role}</span>
            </div>

            <button
              onClick={() => setRole(null)}
              className="p-1.5 text-sleek-text-muted hover:text-sleek-text rounded-xl hover:bg-sleek-overlay transition cursor-pointer"
              title="Switch Role"
            >
              <LogOut size={16} />
            </button>
          </div>
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
              <ScoringInterface 
                match={activeMatch} 
                players={players} 
                onRefresh={forceRefresh} 
                onClose={() => setActiveTab('live')}
                onMatchComplete={(matchId) => {
                  setViewingMatchId(matchId);
                  setActiveTab('history');
                }}
              />
            ) : (
              <div className="bg-sleek-card border border-sleek-border p-8 rounded-3xl text-center space-y-4 shadow-sleek-xl max-w-md mx-auto">
                <div className="w-16 h-16 bg-sleek-overlay text-sleek-accent rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Trophy size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sleek-text text-base">Ready to Score?</h3>
                  <p className="text-xs text-sleek-text-muted">
                    Initialize a balanced teams match with captains, toss details, and custom overs configuration to begin scoring!
                  </p>
                </div>
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-sleek-accent hover:bg-sleek-accent/80 text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Sparkles size={14} fill="currentColor" /> Start A New Match
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'squads' && (
          <div className="space-y-6">
            {/* Elegant Sub-navigation for Squads */}
            <div className="flex bg-sleek-lightcard p-1 rounded-2xl border border-sleek-border max-w-sm mx-auto">
              <button
                onClick={() => setSquadSubTab('players')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  squadSubTab === 'players'
                    ? 'bg-sleek-accent text-black shadow-md'
                    : 'text-sleek-text-muted hover:text-sleek-text hover:bg-sleek-overlay'
                }`}
              >
                Manage Players
              </button>
              <button
                onClick={() => setSquadSubTab('teams')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  squadSubTab === 'teams'
                    ? 'bg-sleek-accent text-black shadow-md'
                    : 'text-sleek-text-muted hover:text-sleek-text hover:bg-sleek-overlay'
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
            <div className="flex bg-sleek-lightcard p-1 rounded-2xl border border-sleek-border max-w-sm mx-auto">
              <button
                onClick={() => setStatsSubTab('leaderboard')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  statsSubTab === 'leaderboard'
                    ? 'bg-sleek-accent text-black shadow-md'
                    : 'text-sleek-text-muted hover:text-sleek-text hover:bg-sleek-overlay'
                }`}
              >
                Stars Leaderboard
              </button>
              <button
                onClick={() => setStatsSubTab('analytics')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  statsSubTab === 'analytics'
                    ? 'bg-sleek-accent text-black shadow-md'
                    : 'text-sleek-text-muted hover:text-sleek-text hover:bg-sleek-overlay'
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
      <nav className="bg-sleek-panel/95 backdrop-blur-md border border-sleek-border fixed bottom-0 left-0 right-0 z-40 px-4 py-2.5 shadow-sleek-2xl flex items-center justify-around max-w-lg mx-auto md:bottom-4 md:rounded-3xl md:border">
        
        {/* Live */}
        <button
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'live' ? 'text-sleek-accent font-black scale-105' : 'text-sleek-text-muted hover:text-sleek-text'
          }`}
        >
          <Activity size={18} className={activeTab === 'live' ? 'animate-pulse text-sleek-accent' : ''} />
          <span className="text-xs mt-1 font-bold tracking-tight uppercase">Live</span>
        </button>

        {/* Squads (Grouped: Players & Teams) */}
        <button
          onClick={() => {
            setActiveTab('squads');
          }}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'squads' ? 'text-sleek-accent font-black scale-105' : 'text-sleek-text-muted hover:text-sleek-text'
          }`}
        >
          <Users size={18} />
          <span className="text-xs mt-1 font-bold tracking-tight uppercase">Squads</span>
        </button>

        {/* Prominent Scorer (Trophy) Centerpiece - Admin Only */}
        {isAdminMode && (
          <button
            onClick={() => setActiveTab('scoring')}
            className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl transition cursor-pointer relative -top-3 shadow-lg ${
              activeTab === 'scoring'
                ? 'bg-sleek-accent text-black font-black scale-110 shadow-sleek-accent/20 border border-sleek-accent'
                : 'bg-sleek-card border border-sleek-border text-sleek-accent hover:text-sleek-text hover:bg-sleek-overlay'
            }`}
          >
            <Trophy size={18} className={activeTab === 'scoring' ? 'text-black' : 'text-sleek-accent'} />
            <span className="text-[9px] mt-1 uppercase font-black tracking-wider">Scorer</span>
          </button>
        )}

        {/* Leaderboard (Grouped: Stars & Analytics) */}
        <button
          onClick={() => {
            setActiveTab('stats');
          }}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'stats' ? 'text-sleek-accent font-black scale-105' : 'text-sleek-text-muted hover:text-sleek-text'
          }`}
        >
          <Award size={18} />
          <span className="text-xs mt-1 font-bold tracking-tight uppercase">Stars</span>
        </button>

        {/* History / Archive */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeTab === 'history' ? 'text-sleek-accent font-black scale-105' : 'text-sleek-text-muted hover:text-sleek-text'
          }`}
        >
          <Calendar size={18} />
          <span className="text-xs mt-1 font-bold tracking-tight uppercase">History</span>
        </button>

      </nav>

      <NewMatchSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        players={players}
        playerStats={playerStats}
        matches={matches}
        onMatchCreated={(matchId) => {
          setActiveTab('scoring');
          forceRefresh();
        }}
      />

      {viewingMatchId && (
        <FullScorecardModal
          match={matches.find(m => m.id === viewingMatchId)!}
          players={players}
          onClose={() => setViewingMatchId(null)}
        />
      )}
    </div>
  );
}
