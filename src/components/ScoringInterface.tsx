import React, { useState } from 'react';
import { Match, Player, TeamScore, BallEvent } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { Play, RotateCcw, AlertTriangle, User, Award, Check } from 'lucide-react';

interface ScoringInterfaceProps {
  match: Match;
  players: Player[];
  onRefresh: () => void;
}

export default function ScoringInterface({ match, players, onRefresh }: ScoringInterfaceProps) {
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<'bowled' | 'caught' | 'runout' | 'stumped' | 'lbw' | 'hit_wicket'>('bowled');
  const [wicketBatterId, setWicketBatterId] = useState<string>('');
  const [fielderName, setFielderName] = useState('');

  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [nextBowlerId, setNextBowlerId] = useState('');

  const [showAwardsPanel, setShowAwardsPanel] = useState(false);
  const [potmId, setPotmId] = useState('');
  const [bestBatterId, setBestBatterId] = useState('');
  const [bestBowlerId, setBestBowlerId] = useState('');
  const [mvpId, setMvpId] = useState('');
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);

  // Determine current active team references
  const isFirstInnings = match.currentInnings === 1;
  const battingTeamKey = isFirstInnings
    ? (match.battingFirst || 'teamA')
    : (match.battingFirst === 'teamA' ? 'teamB' : 'teamA');
  const bowlingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';

  const battingTeam = match[battingTeamKey];
  const bowlingTeam = match[bowlingTeamKey];
  const battingScore = match.scores[battingTeamKey];
  const bowlingScore = match.scores[bowlingTeamKey];

  // Helper to resolve player name
  const getPlayerName = (id: string) => {
    if (id === match.doubleSidedPlayerId) {
      const p = players.find(x => x.id === id);
      return p ? `${p.name} (DS)` : 'Unknown';
    }
    return players.find(p => p.id === id)?.name || 'Unknown';
  };

  const getShorterName = (id: string) => {
    const full = getPlayerName(id);
    return full.split(' ')[0] || full;
  };

  // Safe checks for striker, non-striker, bowler
  const strikerId = match.currentBatter1Id || battingTeam.players[0];
  const nonStrikerId = match.currentBatter2Id || battingTeam.players[1] || battingTeam.players[0];
  const currentBowlerId = match.currentBowlerId || bowlingTeam.players[0];

  const currentOverBalls = match.ballsInOver;
  const currentOversCompleted = match.oversCompleted;

  // Active batter & bowler stats for current match
  const strikerStats = battingScore.batting.find(b => b.playerId === strikerId) || {
    playerId: strikerId,
    name: getPlayerName(strikerId),
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissed: false
  };

  const nonStrikerStats = battingScore.batting.find(b => b.playerId === nonStrikerId) || {
    playerId: nonStrikerId,
    name: getPlayerName(nonStrikerId),
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissed: false
  };

  const activeBowlerStats = bowlingScore.bowling.find(b => b.playerId === currentBowlerId) || {
    playerId: currentBowlerId,
    name: getPlayerName(currentBowlerId),
    overs: 0,
    balls: 0,
    maidens: 0,
    runs: 0,
    wickets: 0,
    economy: 0
  };

  // Partnership stats
  const getPartnershipStats = () => {
    // Find batting players not out or last wicket partnership
    let runs = 0;
    let balls = 0;
    battingScore.batting.forEach(b => {
      if (!b.dismissed && (b.playerId === strikerId || b.playerId === nonStrikerId)) {
        runs += b.runs;
        balls += b.balls;
      }
    });
    return { runs, balls };
  };

  const partnership = getPartnershipStats();

  // Helper: Record ball event and calculate state changes
  const processBall = async (runs: number, isExtra: boolean, extraType: 'wide' | 'noBall' | 'bye' | 'legBye' | null, wicket: any = null) => {
    // Make a deep copy of scores to update safely
    const updatedScores = JSON.parse(JSON.stringify(match.scores)) as Match['scores'];
    const activeBatScore = updatedScores[battingTeamKey];
    const activeBowlScore = updatedScores[bowlingTeamKey];

    // Find batter index
    let strikerIndex = activeBatScore.batting.findIndex(b => b.playerId === strikerId);
    if (strikerIndex === -1) {
      activeBatScore.batting.push({
        playerId: strikerId,
        name: getPlayerName(strikerId),
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissed: false
      });
      strikerIndex = activeBatScore.batting.length - 1;
    }

    // Find bowler index
    let bowlerIndex = activeBowlScore.bowling.findIndex(b => b.playerId === currentBowlerId);
    if (bowlerIndex === -1) {
      activeBowlScore.bowling.push({
        playerId: currentBowlerId,
        name: getPlayerName(currentBowlerId),
        overs: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0
      });
      bowlerIndex = activeBowlScore.bowling.length - 1;
    }

    let runsFromBat = 0;
    let runsExtra = 0;
    let ballIncrement = 0;

    if (!isExtra) {
      runsFromBat = runs;
      ballIncrement = 1;
    } else {
      if (extraType === 'wide') {
        runsExtra = runs + 1; // Wide + any runs
      } else if (extraType === 'noBall') {
        runsFromBat = runs; // Batter gets runs
        runsExtra = 1; // 1 extra for no ball
      } else if (extraType === 'bye' || extraType === 'legBye') {
        runsExtra = runs;
        ballIncrement = 1;
      }
    }

    const totalBallRuns = runsFromBat + runsExtra;

    // Update aggregate team runs/wickets/balls
    activeBatScore.runs += totalBallRuns;
    activeBatScore.balls += ballIncrement;

    // Update batter metrics
    if (ballIncrement > 0) {
      activeBatScore.batting[strikerIndex].balls += 1;
    }
    activeBatScore.batting[strikerIndex].runs += runsFromBat;
    if (runsFromBat === 4) activeBatScore.batting[strikerIndex].fours += 1;
    if (runsFromBat === 6) activeBatScore.batting[strikerIndex].sixes += 1;

    // Update extras
    if (isExtra && extraType) {
      activeBatScore.extras[extraType] += runsExtra;
      activeBatScore.extras.total += runsExtra;
    }

    // Update bowler metrics
    activeBowlScore.bowling[bowlerIndex].balls += ballIncrement;
    // Bowler runs conceded (wides and no balls count against bowler, byes/leg-byes do not)
    if (extraType !== 'bye' && extraType !== 'legBye') {
      activeBowlScore.bowling[bowlerIndex].runs += totalBallRuns;
    }

    // Handle wicket
    if (wicket) {
      activeBatScore.wickets += 1;
      activeBowlScore.bowling[bowlerIndex].wickets += 1;

      // Find dismissed batter in score
      const outBatterId = wicket.playerId;
      const dbIndex = activeBatScore.batting.findIndex(b => b.playerId === outBatterId);
      if (dbIndex !== -1) {
        activeBatScore.batting[dbIndex].dismissed = true;
        activeBatScore.batting[dbIndex].dismissalType = wicket.wicketType;
        if (wicket.fielderName) {
          activeBatScore.batting[dbIndex].dismissedBy = wicket.fielderName;
        }
        activeBatScore.batting[dbIndex].bowlerId = currentBowlerId;
      }
    }

    // Calc next over/ball status
    let nextBallsInOver = currentOverBalls + ballIncrement;
    let nextOversCompleted = currentOversCompleted;
    let nextStrikerId = strikerId;
    let nextNonStrikerId = nonStrikerId;
    let nextBowlerIdState = currentBowlerId;

    // Strike rotation on odd runs (only for runs off bat, and byes/legbyes)
    if ((runsFromBat % 2 !== 0 && !isExtra) || (runsExtra % 2 !== 0 && (extraType === 'bye' || extraType === 'legBye'))) {
      nextStrikerId = nonStrikerId;
      nextNonStrikerId = strikerId;
    }

    // Over complete checking
    let forceBowlerChange = false;
    if (nextBallsInOver >= 6) {
      nextOversCompleted += 1;
      nextBallsInOver = 0;
      // Over finished, swap striker and non-striker
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
      
      // Update bowler's over count
      activeBowlScore.bowling[bowlerIndex].overs += 1;
      // Calculate economy
      const totalOversFraction = activeBowlScore.bowling[bowlerIndex].overs + (activeBowlScore.bowling[bowlerIndex].balls % 6) / 10;
      activeBowlScore.bowling[bowlerIndex].economy = parseFloat((activeBowlScore.bowling[bowlerIndex].runs / (activeBowlScore.bowling[bowlerIndex].balls / 6)).toFixed(2)) || 0;

      forceBowlerChange = true;
    } else {
      // Calculate economy
      const totalOversFraction = activeBowlScore.bowling[bowlerIndex].overs + (activeBowlScore.bowling[bowlerIndex].balls % 6) / 10;
      activeBowlScore.bowling[bowlerIndex].economy = parseFloat((activeBowlScore.bowling[bowlerIndex].runs / (activeBowlScore.bowling[bowlerIndex].balls / 6)).toFixed(2)) || 0;
    }

    // Construct Ball Event
    const ballEvent: BallEvent = {
      id: `ball_${Date.now()}`,
      timestamp: new Date().toISOString(),
      overIndex: currentOversCompleted,
      ballIndex: nextBallsInOver === 0 ? 6 : nextBallsInOver,
      batterId: strikerId,
      batterName: getPlayerName(strikerId),
      bowlerId: currentBowlerId,
      bowlerName: getPlayerName(currentBowlerId),
      runs: runsFromBat,
      extraRuns: runsExtra,
      extraType,
      isWicket: !!wicket,
      wicketType: wicket ? wicket.wicketType : null,
      description: `${getPlayerName(strikerId)} scores ${runsFromBat} runs off ${getPlayerName(currentBowlerId)}.${isExtra ? ` (${extraType})` : ''}${wicket ? ` - WICKET (${wicket.wicketType})` : ''}`
    };

    if (wicket) {
      ballEvent.wicketBatterId = wicket.playerId;
      if (wicket.fielderName) {
        ballEvent.fielderName = wicket.fielderName;
      }
    }

    // Update match documents
    const matchRef = doc(db, 'matches', match.id);
    const updatedTimeline = [...match.timeline, ballEvent];

    // Check innings endings
    const totalWicketsAllowed = battingTeam.players.length + (match.doubleSidedPlayerId ? 1 : 0) - 1;
    const isWicketsOut = activeBatScore.wickets >= totalWicketsAllowed;
    const isOversCompleted = nextOversCompleted >= match.overs;

    let nextInnings = match.currentInnings;
    let nextStatus = match.status;
    let target = match.target;

    if (isFirstInnings) {
      if (isWicketsOut || isOversCompleted) {
        // End Innings 1!
        nextInnings = 2;
        target = activeBatScore.runs + 1;
        // Reset batter and bowler lists for Innings 2
        const nextBattingTeamKey = battingTeamKey === 'teamA' ? 'teamB' : 'teamA';
        const nextBattingTeam = match[nextBattingTeamKey];
        nextStrikerId = nextBattingTeam.players[0];
        nextNonStrikerId = nextBattingTeam.players[1] || nextBattingTeam.players[0];
        
        const nextBowlingTeamKey = battingTeamKey;
        const nextBowlingTeam = match[nextBowlingTeamKey];
        nextBowlerIdState = nextBowlingTeam.players[0];

        nextOversCompleted = 0;
        nextBallsInOver = 0;

        alert(`Innings 1 Completed! Target is ${target} runs for ${match[nextBattingTeamKey].name}.`);
      }
    } else {
      // Innings 2: Check if Target Chased down OR all out / overs done
      const isTargetChased = activeBatScore.runs >= (target || 0);
      if (isTargetChased || isWicketsOut || isOversCompleted) {
        // Match Finished!
        nextStatus = 'completed';
        setShowAwardsPanel(true);
      }
    }

    try {
      await updateDoc(matchRef, {
        scores: updatedScores,
        currentInnings: nextInnings,
        status: nextStatus,
        target,
        currentBatter1Id: nextStrikerId,
        currentBatter2Id: nextNonStrikerId,
        currentBowlerId: forceBowlerChange ? null : nextBowlerIdState, // set null if bowler change is forced
        oversCompleted: nextOversCompleted,
        ballsInOver: nextBallsInOver,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString()
      });

      if (forceBowlerChange && nextStatus !== 'completed') {
        setShowBowlerModal(true);
      }
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleWicketSubmitted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wicketBatterId) return;

    setShowWicketModal(false);
    
    const wicketPayload: any = {
      playerId: wicketBatterId,
      wicketType,
    };
    if (fielderName.trim()) {
      wicketPayload.fielderName = fielderName.trim();
    }

    processBall(0, false, null, wicketPayload);

    setFielderName('');
  };

  const handleBowlerSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextBowlerId) return;

    setShowBowlerModal(false);
    const matchRef = doc(db, 'matches', match.id);
    try {
      await updateDoc(matchRef, {
        currentBowlerId: nextBowlerId,
        updatedAt: new Date().toISOString()
      });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleDeclareAwards = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchRef = doc(db, 'matches', match.id);

    // Determine winner
    const scoreA = match.scores.teamA.runs;
    const scoreB = match.scores.teamB.runs;
    let winner: string | null = 'draw';
    if (scoreA > scoreB) winner = 'teamA';
    if (scoreB > scoreA) winner = 'teamB';

    try {
      await updateDoc(matchRef, {
        status: 'completed',
        winner,
        playerOfTheMatch: potmId || null,
        bestBatter: bestBatterId || null,
        bestBowler: bestBowlerId || null,
        mvp: mvpId || null,
        updatedAt: new Date().toISOString()
      });

      // Calculate career stats updates for all participating players (including double sided)
      const allPlayerIds = new Set<string>();
      match.teamA.players.forEach(pId => allPlayerIds.add(pId));
      match.teamB.players.forEach(pId => allPlayerIds.add(pId));
      if (match.doubleSidedPlayerId) {
        allPlayerIds.add(match.doubleSidedPlayerId);
      }

      await Promise.all(
        Array.from(allPlayerIds).map(async (id) => {
          const statsRef = doc(db, 'player_stats', id);
          const snap = await getDoc(statsRef);
          if (!snap.exists()) return;

          const currentStats = snap.data();

          // Batting
          const battingA = match.scores.teamA.batting.find(b => b.playerId === id);
          const battingB = match.scores.teamB.batting.find(b => b.playerId === id);

          let matchInnings = 0;
          let matchRuns = 0;
          let matchBalls = 0;
          let matchFours = 0;
          let matchSixes = 0;
          let matchDismissals = 0;
          let matchHighest = 0;
          let matchThirty = 0;
          let matchFifty = 0;

          [battingA, battingB].forEach(b => {
            if (b && b.balls > 0) {
              matchInnings += 1;
              matchRuns += b.runs;
              matchBalls += b.balls;
              matchFours += b.fours;
              matchSixes += b.sixes;
              if (b.dismissed) matchDismissals += 1;
              if (b.runs > matchHighest) matchHighest = b.runs;
              if (b.runs >= 50) matchFifty += 1;
              else if (b.runs >= 30) matchThirty += 1;
            }
          });

          // Bowling
          const bowlingA = match.scores.teamA.bowling.find(b => b.playerId === id);
          const bowlingB = match.scores.teamB.bowling.find(b => b.playerId === id);

          let matchBowlInnings = 0;
          let matchWickets = 0;
          let matchRunsConceded = 0;
          let matchBallsBowled = 0;
          let matchMaidens = 0;
          let matchBestWickets = 0;
          let matchBestRuns = 999;
          let playedBowling = false;

          [bowlingA, bowlingB].forEach(b => {
            if (b && b.balls > 0) {
              matchBowlInnings += 1;
              matchWickets += b.wickets;
              matchRunsConceded += b.runs;
              matchBallsBowled += b.balls;
              matchMaidens += b.maidens;
              playedBowling = true;
              if (b.wickets > matchBestWickets) {
                matchBestWickets = b.wickets;
                matchBestRuns = b.runs;
              } else if (b.wickets === matchBestWickets) {
                if (b.runs < matchBestRuns) {
                  matchBestRuns = b.runs;
                }
              }
            }
          });

          // Fielding
          let matchCatches = 0;
          let matchRunOuts = 0;
          let matchStumpings = 0;

          const playerObj = players.find(p => p.id === id);
          const playerName = playerObj ? playerObj.name : '';

          if (playerName) {
            match.timeline.forEach(event => {
              if (event.fielderName && event.fielderName.trim().toLowerCase() === playerName.trim().toLowerCase()) {
                if (event.wicketType === 'caught') matchCatches += 1;
                if (event.wicketType === 'runout') matchRunOuts += 1;
                if (event.wicketType === 'stumped') matchStumpings += 1;
              }
            });
          }

          // Calculate match MVP points based on guidelines
          const matchMvpPoints = (matchRuns * 1) + (matchFours * 1) + (matchSixes * 2) + (matchThirty * 10) + (matchFifty * 20) + (matchWickets * 20) + (matchMaidens * 10) + (matchCatches * 10) + (matchRunOuts * 10) + (matchStumpings * 10);

          // Career aggregates
          const newMatchesPlayed = (currentStats.matchesPlayed || 0) + 1;

          // Batting career
          const newBattingInnings = (currentStats.batting?.innings || 0) + matchInnings;
          const newBattingRuns = (currentStats.batting?.runs || 0) + matchRuns;
          const newBattingBalls = (currentStats.batting?.ballsFaced || 0) + matchBalls;
          const newDismissals = (currentStats.batting?.dismissals || 0) + matchDismissals;
          const newHighestScore = Math.max(currentStats.batting?.highestScore || 0, matchHighest);
          const newThirtyPlus = (currentStats.batting?.thirtyPlus || 0) + matchThirty;
          const newFiftyPlus = (currentStats.batting?.fiftyPlus || 0) + matchFifty;

          const newBattingAverage = newDismissals > 0 ? parseFloat((newBattingRuns / newDismissals).toFixed(2)) : newBattingRuns;
          const newBattingStrikeRate = newBattingBalls > 0 ? parseFloat(((newBattingRuns / newBattingBalls) * 100).toFixed(2)) : 0;

          // Bowling career
          const newBowlingInnings = (currentStats.bowling?.innings || 0) + matchBowlInnings;
          const newWickets = (currentStats.bowling?.wickets || 0) + matchWickets;
          const newRunsConceded = (currentStats.bowling?.runsConceded || 0) + matchRunsConceded;
          const newBallsBowled = ((currentStats.bowling?.oversBowled || 0) * 6) + matchBallsBowled; // Convert existing overs to balls, add match balls
          const newOversBowled = parseFloat((newBallsBowled / 6).toFixed(1)); // Store back as overs decimal

          const newBowlingEconomy = newBallsBowled > 0 ? parseFloat(((newRunsConceded / (newBallsBowled / 6))).toFixed(2)) : 0;
          const newBowlingAverage = newWickets > 0 ? parseFloat((newRunsConceded / newWickets).toFixed(2)) : 0;

          // Best bowling
          let newBestWickets = currentStats.bowling?.bestWickets || 0;
          let newBestRuns = currentStats.bowling?.bestRuns || 0;
          if (playedBowling) {
            if (matchBestWickets > newBestWickets) {
              newBestWickets = matchBestWickets;
              newBestRuns = matchBestRuns;
            } else if (matchBestWickets === newBestWickets) {
              if (matchBestRuns < newBestRuns || newBestRuns === 0) {
                newBestRuns = matchBestRuns;
              }
            }
          }

          // Fielding career
          const newCatches = (currentStats.fielding?.catches || 0) + matchCatches;
          const newRunOuts = (currentStats.fielding?.runOuts || 0) + matchRunOuts;
          const newStumpings = (currentStats.fielding?.stumpings || 0) + matchStumpings;

          // Awards career
          const isPotm = id === potmId;
          const isBBatter = id === bestBatterId;
          const isBBowler = id === bestBowlerId;
          const isMvp = id === mvpId;

          const newPotm = (currentStats.awards?.potm || 0) + (isPotm ? 1 : 0);
          const newBestBatter = (currentStats.awards?.bestBatter || 0) + (isBBatter ? 1 : 0);
          const newBestBowler = (currentStats.awards?.bestBowler || 0) + (isBBowler ? 1 : 0);
          const newMvpAward = (currentStats.awards?.mvp || 0) + (isMvp ? 1 : 0);

          // Base MVP points from this match + award bonuses (15 for POTM, 10 for best, 15 for MVP)
          const awardBonus = (isPotm ? 15 : 0) + (isBBatter ? 10 : 0) + (isBBowler ? 10 : 0) + (isMvp ? 15 : 0);
          const newMvpPoints = (currentStats.awards?.mvpPoints || 0) + matchMvpPoints + awardBonus;

          const updatedPayload = {
            id,
            name: currentStats.name || playerObj?.name || 'Unknown',
            matchesPlayed: newMatchesPlayed,
            batting: {
              innings: newBattingInnings,
              runs: newBattingRuns,
              highestScore: newHighestScore,
              average: newBattingAverage,
              strikeRate: newBattingStrikeRate,
              thirtyPlus: newThirtyPlus,
              fiftyPlus: newFiftyPlus,
              ballsFaced: newBattingBalls,
              dismissals: newDismissals
            },
            bowling: {
              innings: newBowlingInnings,
              wickets: newWickets,
              runsConceded: newRunsConceded,
              oversBowled: newOversBowled,
              economy: newBowlingEconomy,
              average: newBowlingAverage,
              bestWickets: newBestWickets,
              bestRuns: newBestRuns
            },
            fielding: {
              catches: newCatches,
              runOuts: newRunOuts,
              stumpings: newStumpings
            },
            awards: {
              potm: newPotm,
              bestBatter: newBestBatter,
              bestBowler: newBestBowler,
              mvp: newMvpAward,
              mvpPoints: newMvpPoints
            }
          };

          await setDoc(statsRef, updatedPayload);
        })
      );

      setShowAwardsPanel(false);
      alert('Match completed, awards declared, and player career statistics updated successfully!');
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleAbortMatch = async () => {
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        status: 'aborted',
        updatedAt: new Date().toISOString()
      });
      setShowAbortConfirm(false);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target/Run Rate Summary Bar */}
      <div className="bg-[#0F1218] rounded-3xl p-6 text-[#E0E0E0] relative overflow-hidden shadow-2xl border border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#A3FF12]">
              {battingTeam.name} Innings {match.currentInnings}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-white font-mono">{battingScore.runs}/{battingScore.wickets}</span>
              <span className="text-xs text-white/50 font-mono">({currentOversCompleted}.{currentOverBalls} / {match.overs} Ov)</span>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current RR</span>
            <p className="text-lg font-black text-white font-mono">
              {parseFloat((battingScore.runs / ((currentOversCompleted * 6 + currentOverBalls) / 6 || 1)).toFixed(2))}
            </p>
          </div>
        </div>

        {/* Target Board for Innings 2 */}
        {match.currentInnings === 2 && match.target && (
          <div className="pt-3 mt-3 border-t border-white/5 flex justify-between items-center text-xs text-[#A3FF12] font-mono">
            <div>
              Target: <strong className="text-white text-sm">{match.target}</strong>
            </div>
            <div>
              Need <strong className="text-white text-sm">{(match.target || 0) - battingScore.runs}</strong> runs off <strong className="text-white text-sm">{(match.overs * 6) - (currentOversCompleted * 6 + currentOverBalls)}</strong> balls
            </div>
            <div>
              Req RR: <strong className="text-white text-sm">
                {parseFloat((((match.target || 0) - battingScore.runs) / (((match.overs * 6) - (currentOversCompleted * 6 + currentOverBalls)) / 6 || 1)).toFixed(2))}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Batter & Bowler Live Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Batting Box */}
        <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-black text-[#A3FF12] uppercase tracking-wider">Batting</span>
            <span className="text-[11px] text-white/40 font-mono">Partnership: {partnership.runs} ({partnership.balls}b)</span>
          </div>
          <div className="space-y-2">
            {/* Batter 1 (Striker) */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#A3FF12] font-bold">&#9733;</span>
                <span className="font-extrabold text-white truncate">{getShorterName(strikerId)}</span>
              </div>
              <span className="font-black text-white font-mono">{strikerStats.runs} <span className="text-xs text-white/40 font-normal">({strikerStats.balls})</span></span>
            </div>
            {/* Batter 2 (Non-Striker) */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-1.5 min-w-0 pl-4">
                <span className="font-semibold text-white/70 truncate">{getShorterName(nonStrikerId)}</span>
              </div>
              <span className="font-extrabold text-white/70 font-mono">{nonStrikerStats.runs} <span className="text-xs text-white/40 font-normal">({nonStrikerStats.balls})</span></span>
            </div>
          </div>
        </div>

        {/* Bowling Box */}
        <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Bowling</span>
            {currentBowlerId && (
              <span className="text-[11px] text-white/40 font-mono">Econ: {activeBowlerStats.economy}</span>
            )}
          </div>
          {currentBowlerId ? (
            <div className="flex justify-between items-center text-sm">
              <span className="font-extrabold text-white">{getShorterName(currentBowlerId)}</span>
              <span className="font-black text-white font-mono">
                {activeBowlerStats.wickets} <span className="text-xs text-white/40 font-normal">for {activeBowlerStats.runs}</span>
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowBowlerModal(true)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[#A3FF12] text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play size={12} /> Select Bowler for New Over
            </button>
          )}
        </div>
      </div>

      {/* Primary Mobile-First Score Input Board */}
      <div className="bg-[#0F1218] border border-white/5 p-5 rounded-3xl space-y-4">
        <h4 className="text-xs font-black text-white/30 uppercase tracking-widest text-center">Score Input Panel</h4>
        
        {/* Run Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[0, 1, 2, 3, 4, 6].map(r => (
            <button
              key={r}
              onClick={() => processBall(r, false, null)}
              disabled={!currentBowlerId}
              className="py-3.5 bg-white/5 border border-white/10 font-mono font-black text-white text-lg rounded-2xl shadow-sm hover:bg-[#A3FF12] hover:text-black transition flex flex-col items-center justify-center cursor-pointer disabled:opacity-30"
            >
              {r}
              <span className="text-[10px] text-white/40 font-normal">{r === 4 || r === 6 ? 'Boundary' : 'Runs'}</span>
            </button>
          ))}
        </div>

        {/* Extras & Special Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Wide */}
          <button
            onClick={() => processBall(0, true, 'wide')}
            disabled={!currentBowlerId}
            className="py-3 bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 hover:text-[#A3FF12] transition cursor-pointer disabled:opacity-30"
          >
            +1 Wide (Wd)
          </button>
          {/* No Ball */}
          <button
            onClick={() => processBall(0, true, 'noBall')}
            disabled={!currentBowlerId}
            className="py-3 bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 hover:text-[#A3FF12] transition cursor-pointer disabled:opacity-30"
          >
            +1 No-Ball (Nb)
          </button>
          {/* Leg Bye */}
          <button
            onClick={() => processBall(1, true, 'legBye')}
            disabled={!currentBowlerId}
            className="py-3 bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-white hover:bg-white/10 hover:text-[#A3FF12] transition cursor-pointer disabled:opacity-30"
          >
            Leg Bye (Lb)
          </button>
          {/* Wicket */}
          <button
            onClick={() => {
              // Pre-select striker as default wicket taker
              setWicketBatterId(strikerId);
              setShowWicketModal(true);
            }}
            disabled={!currentBowlerId}
            className="py-3 bg-rose-500/10 border border-rose-500/20 text-xs font-black uppercase tracking-wider text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-30"
          >
            OUT / Wicket 🔴
          </button>
        </div>
      </div>

      {/* Match Controls / Admin Action Panel */}
      <div className="bg-[#14181F] border border-white/5 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in duration-200">
        <div className="text-left">
          <span className="font-extrabold text-white text-xs uppercase tracking-wider block">Match Controls</span>
          <span className="text-[11px] text-white/50 block mt-0.5">Need to abort or pause scoring? You can retrieve and resume this match from the Archive later.</span>
        </div>
        <button
          onClick={() => setShowAbortConfirm(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <AlertTriangle size={14} /> Abort Match
        </button>
      </div>

      {/* Modal: Bowler Selection */}
      {showBowlerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleBowlerSelected} className="bg-[#14181F] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="font-extrabold text-[#A3FF12] text-base uppercase tracking-wider">Select Bowler for Next Over</h4>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Available Bowlers (Bowling Team)</label>
              <select
                value={nextBowlerId}
                onChange={(e) => setNextBowlerId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-sm text-white focus:ring-1 focus:ring-[#A3FF12]"
              >
                <option value="">Choose bowler...</option>
                {bowlingTeam.players.map(id => (
                  <option key={id} value={id}>{getPlayerName(id)}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#A3FF12] text-black text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#A3FF12]/80 transition"
            >
              Confirm Bowler
            </button>
          </form>
        </div>
      )}

      {/* Modal: Wicket Registry */}
      {showWicketModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleWicketSubmitted} className="bg-[#14181F] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="font-extrabold text-[#A3FF12] text-base uppercase tracking-wider">Register Wicket Out</h4>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Who got out?</label>
              <select
                value={wicketBatterId}
                onChange={(e) => setWicketBatterId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-sm text-white focus:ring-1 focus:ring-[#A3FF12]"
              >
                <option value={strikerId}>Striker: {getPlayerName(strikerId)}</option>
                <option value={nonStrikerId}>Non-Striker: {getPlayerName(nonStrikerId)}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Dismissal Type</label>
              <select
                value={wicketType}
                onChange={(e) => setWicketType(e.target.value as any)}
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-sm text-white focus:ring-1 focus:ring-[#A3FF12]"
              >
                <option value="bowled">Bowled</option>
                <option value="caught">Caught</option>
                <option value="runout">Run Out</option>
                <option value="stumped">Stumped</option>
                <option value="lbw">LBW</option>
                <option value="hit_wicket">Hit Wicket</option>
              </select>
            </div>

            {(wicketType === 'caught' || wicketType === 'runout' || wicketType === 'stumped') && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Fielder Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Pandian"
                  value={fielderName}
                  onChange={(e) => setFielderName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-sm text-white focus:ring-1 focus:ring-[#A3FF12]"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWicketModal(false)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white/70 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-700 transition"
              >
                Record Out
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Awards Declaration Panel */}
      {showAwardsPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleDeclareAwards} className="bg-[#14181F] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h4 className="font-extrabold text-[#A3FF12] text-base uppercase tracking-wider flex items-center gap-2">
              <Award className="text-[#A3FF12]" /> Declare Match Awards
            </h4>
            <p className="text-xs text-white/50">
              Celebrate the best performance in this local Madurai friendly match!
            </p>

            <div className="space-y-3">
              {/* POTM */}
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Player of the Match (POTM)</label>
                <select
                  value={potmId}
                  onChange={(e) => setPotmId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-xs text-white focus:ring-1 focus:ring-[#A3FF12] font-semibold"
                >
                  <option value="">Select player...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{getPlayerName(id)}</option>
                  ))}
                </select>
              </div>

              {/* Best Batter */}
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Best Batter</label>
                <select
                  value={bestBatterId}
                  onChange={(e) => setBestBatterId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-xs text-white focus:ring-1 focus:ring-[#A3FF12] font-semibold"
                >
                  <option value="">Select player...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{getPlayerName(id)}</option>
                  ))}
                </select>
              </div>

              {/* Best Bowler */}
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Best Bowler</label>
                <select
                  value={bestBowlerId}
                  onChange={(e) => setBestBowlerId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-xs text-white focus:ring-1 focus:ring-[#A3FF12] font-semibold"
                >
                  <option value="">Select player...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{getPlayerName(id)}</option>
                  ))}
                </select>
              </div>

              {/* MVP */}
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Most Valuable Player (MVP)</label>
                <select
                  value={mvpId}
                  onChange={(e) => setMvpId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none text-xs text-white focus:ring-1 focus:ring-[#A3FF12] font-semibold"
                >
                  <option value="">Select player...</option>
                  {[...match.teamA.players, ...match.teamB.players].map(id => (
                    <option key={id} value={id}>{getPlayerName(id)}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#A3FF12] text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#A3FF12]/80 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check size={14} /> Finish Match & Declare Awards
            </button>
          </form>
        </div>
      )}

      {/* Modal: Custom Abort Confirmation Modal */}
      {showAbortConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#14181F] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Abort Active Match?</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Are you sure you want to abort this match? It will be safely stored in the Archive where you can resume or delete it later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAbortConfirm(false)}
                className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAbortMatch}
                className="py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                Abort Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
