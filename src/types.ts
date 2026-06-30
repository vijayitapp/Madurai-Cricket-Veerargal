export interface Player {
  id: string;
  name: string;
  mobile?: string;
  avatar?: string;
  available: boolean;
  attendance: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatterMatchStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissed: boolean;
  dismissalType?: 'bowled' | 'caught' | 'runout' | 'stumped' | 'lbw' | 'hit_wicket' | null;
  dismissedBy?: string; // name of fielder
  bowlerId?: string; // bowler who got the wicket
}

export interface BowlerMatchStats {
  playerId: string;
  name: string;
  overs: number; // custom format or we can store balls bowled and compute
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface TeamScore {
  runs: number;
  wickets: number;
  balls: number;
  extras: {
    wide: number;
    noBall: number;
    bye: number;
    legBye: number;
    total: number;
  };
  batting: BatterMatchStats[];
  bowling: BowlerMatchStats[];
}

export interface BallEvent {
  id: string;
  timestamp: string;
  innings: 1 | 2; // which innings this ball belongs to
  overIndex: number; // 0-based over
  ballIndex: number; // 1-6
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  runs: number; // runs from bat
  extraRuns: number;
  extraType: 'wide' | 'noBall' | 'bye' | 'legBye' | null;
  isWicket: boolean;
  wicketType: 'bowled' | 'caught' | 'runout' | 'stumped' | 'lbw' | 'hit_wicket' | null;
  wicketBatterId?: string;
  fielderName?: string;
  description: string;
}

export interface Match {
  id: string;
  status: 'setup' | 'toss' | 'scoring' | 'completed' | 'aborted';
  overs: number; // 5, 6, 8, or custom
  tossWinner?: string; // team id or name
  tossDecision?: 'bat' | 'bowl';
  teamA: {
    name: string;
    players: string[]; // playerId array
  };
  teamB: {
    name: string;
    players: string[]; // playerId array
  };
  doubleSidedPlayerId?: string | null;
  captainA?: string | null;
  captainB?: string | null;
  battingFirst?: 'teamA' | 'teamB';
  scores: {
    teamA: TeamScore;
    teamB: TeamScore;
  };
  currentInnings: 1 | 2;
  currentBatter1Id?: string | null; // striker
  currentBatter2Id?: string | null; // non-striker
  currentBowlerId?: string | null;
  oversCompleted: number;
  ballsInOver: number;
  target?: number | null;
  winner?: string | null; // "teamA" | "teamB" | "draw"
  playerOfTheMatch?: string | null;
  previousState?: string | null; // JSON string of Match state before the last ball
  bestBatter?: string | null;
  bestBowler?: string | null;
  mvp?: string | null;
  timeline: BallEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  matchesPlayed: number;
  batting: {
    innings: number;
    runs: number;
    highestScore: number;
    average: number;
    strikeRate: number;
    thirtyPlus: number;
    fiftyPlus: number;
    ballsFaced: number;
    dismissals: number;
  };
  bowling: {
    innings: number;
    wickets: number;
    runsConceded: number;
    oversBowled: number;
    economy: number;
    average: number;
    bestWickets: number;
    bestRuns: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
  awards: {
    potm: number;
    bestBatter: number;
    bestBowler: number;
    mvp: number;
    mvpPoints: number;
  };
}
