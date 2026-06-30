import { Match, Player, BallEvent } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface UseMatchScoringProps {
  match: Match;
  players: Player[];
  onRefresh: () => void;
  setShowBowlerModal: (show: boolean) => void;
  setShowAwardsPanel: (show: boolean) => void;
  onToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useMatchScoring({ match, players, onRefresh, setShowBowlerModal, setShowAwardsPanel, onToast }: UseMatchScoringProps) {
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
  const currentBowlerId = match.currentBowlerId;

  const currentOverBalls = match.ballsInOver;
  const currentOversCompleted = match.oversCompleted;

  // Active batter & bowler stats for current match
  const strikerStats = battingScore.batting.find(b => b.playerId === strikerId) || {
    playerId: strikerId,
    name: getPlayerName(strikerId),
    runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false
  };

  const nonStrikerStats = battingScore.batting.find(b => b.playerId === nonStrikerId) || {
    playerId: nonStrikerId,
    name: getPlayerName(nonStrikerId),
    runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false
  };

  const activeBowlerStats = bowlingScore.bowling.find(b => b.playerId === currentBowlerId) || {
    playerId: currentBowlerId,
    name: getPlayerName(currentBowlerId),
    overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0
  };

  // Partnership: count runs & legal balls since the last wicket IN THE CURRENT INNINGS
  const getPartnershipStats = () => {
    // Filter to only current innings events (also handles old events without innings field)
    const inningsEvents = match.timeline.filter(ev =>
      (ev as any).innings === undefined || (ev as any).innings === match.currentInnings
    );

    // Find index of last wicket in this innings
    let partnershipStart = 0;
    for (let i = inningsEvents.length - 1; i >= 0; i--) {
      if (inningsEvents[i].isWicket) {
        partnershipStart = i + 1;
        break;
      }
    }

    const events = inningsEvents.slice(partnershipStart);
    let runs = 0, balls = 0;
    events.forEach(ev => {
      // Wides and No Balls are NOT legal deliveries for balls count
      if (ev.extraType !== 'wide' && ev.extraType !== 'noBall') balls++;
      runs += ev.runs + ev.extraRuns;
    });
    return { runs, balls };
  };

  const processBall = async (
    runs: number,
    isExtra: boolean,
    extraType: 'wide' | 'noBall' | 'bye' | 'legBye' | null,
    wicket: any = null
  ) => {
    // Slim snapshot: exclude timeline and previousState to drastically reduce Firestore doc size
    const { timeline: _tl, previousState: _ps, ...coreState } = match as any;
    const previousStateString = JSON.stringify(coreState);

    // Deep copy scores
    const updatedScores = JSON.parse(JSON.stringify(match.scores)) as Match['scores'];
    const activeBatScore = updatedScores[battingTeamKey];
    const activeBowlScore = updatedScores[bowlingTeamKey];

    // Find or create batter entry
    let strikerIndex = activeBatScore.batting.findIndex(b => b.playerId === strikerId);
    if (strikerIndex === -1) {
      activeBatScore.batting.push({ playerId: strikerId, name: getPlayerName(strikerId), runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, dismissalType: null });
      strikerIndex = activeBatScore.batting.length - 1;
    }

    // Find or create bowler entry
    let bowlerIndex = activeBowlScore.bowling.findIndex(b => b.playerId === currentBowlerId);
    if (bowlerIndex === -1) {
      activeBowlScore.bowling.push({ playerId: currentBowlerId, name: getPlayerName(currentBowlerId), overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 });
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
        runsExtra = 1; // Only 1 wide penalty, no bye runs per our rules
        // wide = 0 ballIncrement
      } else if (extraType === 'noBall') {
        runsFromBat = runs; // Batter keeps runs
        runsExtra = 0;      // Per our rules: no extra run penalty for no ball
        // noBall = 0 ballIncrement (extra delivery is re-bowled)
      } else if (extraType === 'bye') {
        runsExtra = runs;
        ballIncrement = 1;
      }
    }

    const totalBallRuns = runsFromBat + runsExtra;

    activeBatScore.runs += totalBallRuns;
    activeBatScore.balls += ballIncrement;

    if (ballIncrement > 0) {
      activeBatScore.batting[strikerIndex].balls += 1;
    }
    activeBatScore.batting[strikerIndex].runs += runsFromBat;
    if (runsFromBat === 4) activeBatScore.batting[strikerIndex].fours += 1;
    if (runsFromBat === 6) activeBatScore.batting[strikerIndex].sixes += 1;

    if (isExtra && extraType) {
      activeBatScore.extras[extraType] += runsExtra;
      activeBatScore.extras.total += runsExtra;
    }

    activeBowlScore.bowling[bowlerIndex].balls += ballIncrement;
    if (extraType !== 'bye') {
      activeBowlScore.bowling[bowlerIndex].runs += totalBallRuns;
    }

    if (wicket) {
      activeBatScore.wickets += 1;
      // Don't credit wicket to bowler on a No Ball
      if (extraType !== 'noBall') {
        activeBowlScore.bowling[bowlerIndex].wickets += 1;
      }

      const outBatterId = wicket.playerId;
      const dbIndex = activeBatScore.batting.findIndex(b => b.playerId === outBatterId);
      if (dbIndex !== -1) {
        activeBatScore.batting[dbIndex].dismissed = true;
        activeBatScore.batting[dbIndex].dismissalType = wicket.wicketType;
        if (wicket.fielderName) {
          activeBatScore.batting[dbIndex].dismissedBy = wicket.fielderName;
        }
        if (extraType !== 'noBall') {
          activeBatScore.batting[dbIndex].bowlerId = currentBowlerId;
        }
      }
    }

    let nextBallsInOver = currentOverBalls + ballIncrement;
    let nextOversCompleted = currentOversCompleted;
    let nextStrikerId = strikerId;
    let nextNonStrikerId = nonStrikerId;
    let nextBowlerIdState = currentBowlerId;

    // Strike rotation for odd runs (only for legal deliveries and non-wide extras)
    if ((runsFromBat % 2 !== 0 && !isExtra) || (runsExtra % 2 !== 0 && extraType === 'bye')) {
      nextStrikerId = nonStrikerId;
      nextNonStrikerId = strikerId;
    }

    let forceBowlerChange = false;
    if (nextBallsInOver >= 6) {
      nextOversCompleted += 1;
      nextBallsInOver = 0;
      // End-of-over strike rotation
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;

      activeBowlScore.bowling[bowlerIndex].overs += 1;
      const bowlBalls = activeBowlScore.bowling[bowlerIndex].balls;
      const bowlRuns = activeBowlScore.bowling[bowlerIndex].runs;
      activeBowlScore.bowling[bowlerIndex].economy = bowlBalls > 0
        ? parseFloat((bowlRuns / (bowlBalls / 6)).toFixed(2))
        : 0;

      forceBowlerChange = true;
    } else {
      const bowlBalls = activeBowlScore.bowling[bowlerIndex].balls;
      const bowlRuns = activeBowlScore.bowling[bowlerIndex].runs;
      activeBowlScore.bowling[bowlerIndex].economy = bowlBalls > 0
        ? parseFloat((bowlRuns / (bowlBalls / 6)).toFixed(2))
        : 0;
    }

    const ballEvent: BallEvent = {
      id: `ball_${Date.now()}`,
      timestamp: new Date().toISOString(),
      innings: match.currentInnings, // ← tag each event with its innings
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
      if (wicket.fielderName) ballEvent.fielderName = wicket.fielderName;
    }

    const matchRef = doc(db, 'matches', match.id);
    const updatedTimeline = [...match.timeline, ballEvent];

    const totalWicketsAllowed = battingTeam.players.length + (match.doubleSidedPlayerId ? 1 : 0) - 1;
    const isWicketsOut = activeBatScore.wickets >= totalWicketsAllowed;
    const isOversCompleted = nextOversCompleted >= match.overs;

    let nextInnings = match.currentInnings;
    let nextStatus = match.status;
    let target = match.target;

    if (isFirstInnings) {
      if (isWicketsOut || isOversCompleted) {
        nextInnings = 2;
        target = activeBatScore.runs + 1;
        nextStrikerId = null;
        nextNonStrikerId = null;
        nextBowlerIdState = null;
        nextOversCompleted = 0;
        nextBallsInOver = 0;
        // Toast instead of alert
        onToast(`Innings 1 Complete! ${match[battingTeamKey === 'teamA' ? 'teamB' : 'teamA'].name} need ${target} to win.`, 'info');
      }
    } else {
      const isTargetChased = activeBatScore.runs >= (target || 0);
      if (isTargetChased || isWicketsOut || isOversCompleted) {
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
        currentBowlerId: forceBowlerChange ? null : nextBowlerIdState,
        oversCompleted: nextOversCompleted,
        ballsInOver: nextBallsInOver,
        timeline: updatedTimeline,
        previousState: previousStateString, // Slim snapshot (no timeline)
        updatedAt: new Date().toISOString()
      });

      if (forceBowlerChange && nextStatus !== 'completed' && nextInnings === match.currentInnings) {
        setShowBowlerModal(true);
      }
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const undoLastBall = async () => {
    if (!match.previousState) {
      onToast('No previous state available to undo.', 'warning');
      return;
    }

    try {
      const prevState = JSON.parse(match.previousState);
      const matchRef = doc(db, 'matches', match.id);

      await updateDoc(matchRef, {
        scores: prevState.scores,
        currentInnings: prevState.currentInnings,
        status: prevState.status,
        target: prevState.target || null,
        currentBatter1Id: prevState.currentBatter1Id || null,
        currentBatter2Id: prevState.currentBatter2Id || null,
        currentBowlerId: prevState.currentBowlerId || null,
        oversCompleted: prevState.oversCompleted,
        ballsInOver: prevState.ballsInOver,
        timeline: match.timeline.slice(0, -1), // Pop the last ball event from the current timeline
        previousState: null,
        updatedAt: new Date().toISOString()
      });

      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  return {
    processBall,
    undoLastBall,
    battingTeam,
    bowlingTeam,
    battingScore,
    bowlingScore,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    strikerStats,
    nonStrikerStats,
    activeBowlerStats,
    partnership: getPartnershipStats(),
    currentOversCompleted,
    currentOverBalls,
    getPlayerName,
    getShorterName
  };
}
