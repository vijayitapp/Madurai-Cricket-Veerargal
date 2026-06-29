import { Player, PlayerStats } from '../types';

export const MADURAI_PLAYER_NAMES = [
  "Alagarasamy",
  "Pandian",
  "Muthu Kumar",
  "Karuppasamy",
  "Veera Senthil",
  "Chinnasamy",
  "Murugavel",
  "Saravana Selvam",
  "Karthikeyan",
  "Vignesh Raja",
  "Anbazhagan",
  "Meenakshi Sundaram",
  "Solaimalai",
  "Thirumavalavan",
  "Mariamma Durai",
  "Ramasundaram",
  "Sankaranarayanan",
  "Ganesa Moorthy",
  "Chellapandian",
  "Thangapandian",
  "Chidambaram",
  "Madasamy",
  "Velmurugan",
  "Kaliappan",
  "Pitchai"
];

export const generateDefaultPlayers = (): Player[] => {
  return MADURAI_PLAYER_NAMES.map((name, index) => {
    const id = `player_${index + 1}`;
    // Seed some attendance (10-25)
    const attendance = Math.floor(Math.random() * 15) + 10;
    // Set 18 players available by default to make team builder instantly testable
    const available = index < 17; 
    
    return {
      id,
      name,
      mobile: `+91 98421 ${Math.floor(10000 + Math.random() * 90000)}`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
      available,
      attendance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
};

export const generateDefaultStats = (players: Player[]): PlayerStats[] => {
  return players.map((player) => {
    const mPlayed = player.attendance;
    const innings = Math.floor(mPlayed * 0.9);
    
    // Batting stats
    const bRuns = Math.floor(Math.random() * 350) + 50;
    const dismissals = Math.floor(innings * 0.8) || 1;
    const highestScore = Math.floor(Math.random() * 50) + 20;
    const bBalls = Math.floor(bRuns * (1.1 + Math.random() * 0.6));
    
    // Bowling stats
    const bowlInnings = Math.floor(mPlayed * 0.7);
    const wickets = Math.floor(Math.random() * 20) + 3;
    const runsConceded = Math.floor(wickets * (10 + Math.random() * 12));
    const ballsBowled = bowlInnings * 12 + Math.floor(Math.random() * 24);
    const oversBowled = parseFloat((Math.floor(ballsBowled / 6) + (ballsBowled % 6) / 10).toFixed(1));
    const econ = parseFloat((runsConceded / (ballsBowled / 6)).toFixed(2)) || 7.5;

    // Fielding
    const catches = Math.floor(Math.random() * 12);
    const runOuts = Math.floor(Math.random() * 5);
    const stumpings = Math.floor(Math.random() * 3);

    // Awards
    const potm = Math.floor(Math.random() * 4);
    const bestBatter = Math.floor(Math.random() * 3);
    const bestBowler = Math.floor(Math.random() * 3);
    const mvpPoints = parseFloat((bRuns * 1.2 + wickets * 20 + catches * 10 + runOuts * 15).toFixed(1));
    const mvp = Math.floor(mvpPoints / 100);

    return {
      id: player.id,
      name: player.name,
      matchesPlayed: mPlayed,
      batting: {
        innings,
        runs: bRuns,
        highestScore,
        average: parseFloat((bRuns / dismissals).toFixed(2)),
        strikeRate: parseFloat(((bRuns / bBalls) * 100).toFixed(2)),
        thirtyPlus: Math.floor(Math.random() * 4),
        fiftyPlus: highestScore >= 50 ? 1 : 0,
        ballsFaced: bBalls,
        dismissals
      },
      bowling: {
        innings: bowlInnings,
        wickets,
        runsConceded,
        oversBowled,
        economy: econ,
        average: parseFloat((runsConceded / wickets).toFixed(2)),
        bestWickets: Math.floor(Math.random() * 3) + 2,
        bestRuns: Math.floor(Math.random() * 15) + 5
      },
      fielding: {
        catches,
        runOuts,
        stumpings
      },
      awards: {
        potm,
        bestBatter,
        bestBowler,
        mvp,
        mvpPoints
      }
    };
  });
};
