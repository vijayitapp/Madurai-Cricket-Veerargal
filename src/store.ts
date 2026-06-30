import { create } from 'zustand';
import { Player, PlayerStats, Match } from './types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface AppState {
  players: Player[];
  playerStats: PlayerStats[];
  matches: Match[];
  activeMatch: Match | null;
  loadingData: boolean;
  initStore: () => () => void; // Returns an unsubscribe function
}

export const useAppStore = create<AppState>((set) => ({
  players: [],
  playerStats: [],
  matches: [],
  activeMatch: null,
  loadingData: true,

  initStore: () => {
    // Players listener
    const playersQuery = query(collection(db, 'players'), orderBy('name', 'asc'));
    const unsubPlayers = onSnapshot(playersQuery, (snapshot) => {
      const list: Player[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Player);
      });
      set({ players: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'players');
    });

    // Player Stats listener
    const statsQuery = collection(db, 'player_stats');
    const unsubStats = onSnapshot(statsQuery, (snapshot) => {
      const list: PlayerStats[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as PlayerStats);
      });
      set({ playerStats: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'player_stats');
    });

    // Matches listener
    const matchesQuery = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsubMatches = onSnapshot(matchesQuery, (snapshot) => {
      const list: Match[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Match);
      });
      
      const active = list.find(m => m.status === 'scoring');
      set({ matches: list, activeMatch: active || null, loadingData: false });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });

    return () => {
      unsubPlayers();
      unsubStats();
      unsubMatches();
    };
  }
}));
