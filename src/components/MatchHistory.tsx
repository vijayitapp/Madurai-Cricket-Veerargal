import React, { useState } from 'react';
import { Match, Player, PlayerStats } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Calendar, Share2, Printer, ChevronDown, ChevronUp, Trophy, ArrowRight, Zap, Sparkles, AlertTriangle, Play } from 'lucide-react';

interface MatchHistoryProps {
  matches: Match[];
  players: Player[];
  onRefresh: () => void;
  isAdminMode?: boolean;
  onResumeMatch?: (matchId: string) => void;
}

export default function MatchHistory({ matches, players, onRefresh, isAdminMode = false, onResumeMatch }: MatchHistoryProps) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [resumeConfirmMatch, setResumeConfirmMatch] = useState<Match | null>(null);
  const [deleteConfirmMatchId, setDeleteConfirmMatchId] = useState<string | null>(null);

  // Helper to resolve player name
  const getPlayerName = (id: string) => {
    if (id === 'double_sided') return 'Double Sided Player';
    return players.find(p => p.id === id)?.name || 'Unknown Player';
  };

  const getShorterName = (id: string) => {
    const full = getPlayerName(id);
    return full.split(' ')[0] || full;
  };

  const handleToggleExpand = (matchId: string) => {
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  // Share match summary text
  const handleShareSummary = (match: Match) => {
    setSharing(true);
    const scoreA = match.scores.teamA;
    const scoreB = match.scores.teamB;
    const battingFirst = match.battingFirst === 'teamA' ? match.teamA.name : match.teamB.name;
    const battingSecond = match.battingFirst === 'teamA' ? match.teamB.name : match.teamA.name;
    const scoreFirst = match.scores[match.battingFirst || 'teamA'];
    const scoreSecond = match.scores[match.battingFirst === 'teamA' ? 'teamB' : 'teamA'];
    const winnerName = match.winner === 'draw' ? 'Match Draw' : (match.winner === 'teamA' ? match.teamA.name : match.teamB.name);

    const summaryText = `🏏 Madurai Cricket Veeragal Match Summary! 🏏\n` +
      `-------------------------------------------\n` +
      `📅 Date: ${new Date(match.createdAt).toLocaleDateString()}\n` +
      `Format: ${match.overs} Overs Match\n` +
      `💥 1st Inns: ${battingFirst} - ${scoreFirst.runs}/${scoreFirst.wickets} in ${match.overs} Overs\n` +
      `💥 2nd Inns: ${battingSecond} - ${scoreSecond.runs}/${scoreSecond.wickets}\n` +
      `🏆 Result: ${match.winner === 'draw' ? 'Match Draw' : `${winnerName} won!`}\n` +
      `⭐ POTM: ${match.playerOfTheMatch ? getPlayerName(match.playerOfTheMatch) : 'N/A'}\n` +
      `Join the local community and view more profiles!`;

    navigator.clipboard.writeText(summaryText);
    alert('Match summary copied to clipboard! You can now paste and share on WhatsApp, Facebook, or SMS.');
    setSharing(false);
  };

  // Mock PDF Export Scorecard by printing specific section
  const handlePrintScorecard = (matchId: string) => {
    window.print();
  };

  // Seed some completed match history
  const handleSeedCompletedMatches = async () => {
    setLoadingDemo(true);
    const mockMatchId = `match_demo_${Date.now()}`;
    
    // Choose some available players
    const playingIds = players.slice(0, 10).map(p => p.id);
    if (playingIds.length < 4) {
      alert('Please seed/register players first before seeding historical matches!');
      setLoadingDemo(false);
      return;
    }

    const tA = playingIds.slice(0, 5);
    const tB = playingIds.slice(5, 10);

    const mockMatch: Match = {
      id: mockMatchId,
      status: 'completed',
      overs: 6,
      tossWinner: 'Team A',
      tossDecision: 'bat',
      teamA: { name: 'Team A', players: tA },
      teamB: { name: 'Team B', players: tB },
      battingFirst: 'teamA',
      scores: {
        teamA: {
          runs: 68,
          wickets: 3,
          balls: 36,
          extras: { wide: 3, noBall: 1, bye: 0, legBye: 0, total: 4 },
          batting: tA.map((id, index) => ({
            playerId: id,
            name: getPlayerName(id),
            runs: index === 0 ? 32 : index === 1 ? 18 : 14,
            balls: index === 0 ? 15 : index === 1 ? 12 : 9,
            fours: index === 0 ? 3 : 1,
            sixes: index === 0 ? 2 : 0,
            dismissed: index < 3,
            dismissalType: 'caught',
            dismissedBy: getPlayerName(tB[0])
          })),
          bowling: tB.map((id, index) => ({
            playerId: id,
            name: getPlayerName(id),
            overs: index === 0 ? 2 : 1,
            balls: index === 0 ? 12 : 6,
            maidens: 0,
            runs: index === 0 ? 18 : 12,
            wickets: index === 0 ? 2 : 1,
            economy: index === 0 ? 9 : 12
          }))
        },
        teamB: {
          runs: 69,
          wickets: 2,
          balls: 34,
          extras: { wide: 2, noBall: 0, bye: 0, legBye: 1, total: 3 },
          batting: tB.map((id, index) => ({
            playerId: id,
            name: getPlayerName(id),
            runs: index === 0 ? 41 : index === 1 ? 20 : 5,
            balls: index === 0 ? 18 : index === 1 ? 12 : 4,
            fours: index === 0 ? 5 : 2,
            sixes: index === 0 ? 2 : 0,
            dismissed: index < 2,
            dismissalType: 'bowled',
            bowlerId: tA[0]
          })),
          bowling: tA.map((id, index) => ({
            playerId: id,
            name: getPlayerName(id),
            overs: index === 0 ? 2 : 1,
            balls: index === 0 ? 12 : 6,
            maidens: 0,
            runs: index === 0 ? 22 : 15,
            wickets: index === 0 ? 1 : 1,
            economy: index === 0 ? 11 : 15
          }))
        }
      },
      currentInnings: 2,
      oversCompleted: 5,
      ballsInOver: 4,
      target: 69,
      winner: 'teamB',
      playerOfTheMatch: tB[0],
      bestBatter: tB[0],
      bestBowler: tB[0],
      mvp: tB[0],
      timeline: [
        {
          id: 'b1',
          timestamp: new Date().toISOString(),
          innings: 2 as (1 | 2),
          overIndex: 5,
          ballIndex: 4,
          batterId: tB[0],
          batterName: getPlayerName(tB[0]),
          bowlerId: tA[0],
          bowlerName: getPlayerName(tA[0]),
          runs: 6,
          extraRuns: 0,
          extraType: null,
          isWicket: false,
          wicketType: null,
          description: 'Pandian smashes a giant sixer over mid-wicket off Veera Senthil to seal the match!'
        }
      ],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'matches', mockMatchId), mockMatch);
      alert('Successfully seeded 1 mock completed local cricket match with full statistics scorecard and timeline!');
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `matches/${mockMatchId}`);
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleResumeMatch = async (match: Match) => {
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        status: 'scoring',
        updatedAt: new Date().toISOString()
      });
      setResumeConfirmMatch(null);
      if (onResumeMatch) {
        onResumeMatch(match.id);
      }
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `matches/${match.id}`);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      const matchToDelete = matches.find(m => m.id === matchId);
      if (matchToDelete) {
        // Find all participating player IDs
        const allPlayerIds = new Set<string>();
        matchToDelete.teamA.players.forEach(pId => allPlayerIds.add(pId));
        matchToDelete.teamB.players.forEach(pId => allPlayerIds.add(pId));
        if (matchToDelete.doubleSidedPlayerId) {
          allPlayerIds.add(matchToDelete.doubleSidedPlayerId);
        }

        // 1. Roll back attendance count in the 'players' collection
        await Promise.all(
          Array.from(allPlayerIds).map(async (id) => {
            const playerRef = doc(db, 'players', id);
            const playerSnap = await getDoc(playerRef);
            if (playerSnap.exists()) {
              const playerData = playerSnap.data();
              const currentAttendance = playerData.attendance || 0;
              await updateDoc(playerRef, {
                attendance: Math.max(0, currentAttendance - 1),
                updatedAt: new Date().toISOString()
              });
            }
          })
        );

        // 2. Roll back career statistics in 'player_stats' if completed
        if (matchToDelete.status === 'completed') {
          await Promise.all(
            Array.from(allPlayerIds).map(async (id) => {
              const statsRef = doc(db, 'player_stats', id);
              const snap = await getDoc(statsRef);
              if (!snap.exists()) return;

              const currentStats = snap.data();

              // Calculate this match's specific contributions
              const battingA = matchToDelete.scores.teamA.batting.find(b => b.playerId === id);
              const battingB = matchToDelete.scores.teamB.batting.find(b => b.playerId === id);

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
              const bowlingA = matchToDelete.scores.teamA.bowling.find(b => b.playerId === id);
              const bowlingB = matchToDelete.scores.teamB.bowling.find(b => b.playerId === id);

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
                matchToDelete.timeline.forEach(event => {
                  if (event.fielderName && event.fielderName.trim().toLowerCase() === playerName.trim().toLowerCase()) {
                    if (event.wicketType === 'caught') matchCatches += 1;
                    if (event.wicketType === 'runout') matchRunOuts += 1;
                    if (event.wicketType === 'stumped') matchStumpings += 1;
                  }
                });
              }

              // Match MVP points
              const matchMvpPoints = (matchRuns * 1) + (matchFours * 1) + (matchSixes * 2) + (matchThirty * 10) + (matchFifty * 20) + (matchWickets * 20) + (matchMaidens * 10) + (matchCatches * 10) + (matchRunOuts * 10) + (matchStumpings * 10);

              // Subtract from current stats, bounding with Math.max(0, ...)
              const newMatchesPlayed = Math.max(0, (currentStats.matchesPlayed || 0) - 1);

              // Batting rollback
              const newBattingInnings = Math.max(0, (currentStats.batting?.innings || 0) - matchInnings);
              const newBattingRuns = Math.max(0, (currentStats.batting?.runs || 0) - matchRuns);
              const newBattingBalls = Math.max(0, (currentStats.batting?.ballsFaced || 0) - matchBalls);
              const newDismissals = Math.max(0, (currentStats.batting?.dismissals || 0) - matchDismissals);
              const newThirtyPlus = Math.max(0, (currentStats.batting?.thirtyPlus || 0) - matchThirty);
              const newFiftyPlus = Math.max(0, (currentStats.batting?.fiftyPlus || 0) - matchFifty);

              // High score calculation:
              let otherHighest = 0;
              matches.forEach(m => {
                if (m.id !== matchToDelete.id && m.status === 'completed') {
                  const bA = m.scores.teamA.batting.find(b => b.playerId === id);
                  const bB = m.scores.teamB.batting.find(b => b.playerId === id);
                  [bA, bB].forEach(b => {
                    if (b && b.balls > 0 && b.runs > otherHighest) {
                      otherHighest = b.runs;
                    }
                  });
                }
              });

              let newHighestScore = currentStats.batting?.highestScore || 0;
              if (matchHighest === newHighestScore) {
                newHighestScore = Math.max(otherHighest, Math.round(newHighestScore * 0.8));
              }

              const newBattingAverage = newDismissals > 0 ? parseFloat((newBattingRuns / newDismissals).toFixed(2)) : newBattingRuns;
              const newBattingStrikeRate = newBattingBalls > 0 ? parseFloat(((newBattingRuns / newBattingBalls) * 100).toFixed(2)) : 0;

              // Bowling rollback
              const newBowlingInnings = Math.max(0, (currentStats.bowling?.innings || 0) - matchBowlInnings);
              const newWickets = Math.max(0, (currentStats.bowling?.wickets || 0) - matchWickets);
              const newRunsConceded = Math.max(0, (currentStats.bowling?.runsConceded || 0) - matchRunsConceded);
              const currentOvers = currentStats.bowling?.oversBowled || 0;
              const currentBalls = Math.round(currentOvers * 6);
              const newBallsBowled = Math.max(0, currentBalls - matchBallsBowled);
              const newOversBowled = parseFloat((newBallsBowled / 6).toFixed(1));

              const newBowlingEconomy = newBallsBowled > 0 ? parseFloat(((newRunsConceded / (newBallsBowled / 6))).toFixed(2)) : 0;
              const newBowlingAverage = newWickets > 0 ? parseFloat((newRunsConceded / newWickets).toFixed(2)) : 0;

              // Best bowling rollback
              let otherBestWickets = 0;
              let otherBestRuns = 999;
              matches.forEach(m => {
                if (m.id !== matchToDelete.id && m.status === 'completed') {
                  const bA = m.scores.teamA.bowling.find(b => b.playerId === id);
                  const bB = m.scores.teamB.bowling.find(b => b.playerId === id);
                  [bA, bB].forEach(b => {
                    if (b && b.balls > 0) {
                      if (b.wickets > otherBestWickets) {
                        otherBestWickets = b.wickets;
                        otherBestRuns = b.runs;
                      } else if (b.wickets === otherBestWickets) {
                        if (b.runs < otherBestRuns) {
                          otherBestRuns = b.runs;
                        }
                      }
                    }
                  });
                }
              });

              let newBestWickets = currentStats.bowling?.bestWickets || 0;
              let newBestRuns = currentStats.bowling?.bestRuns || 0;
              if (playedBowling && matchBestWickets === newBestWickets && matchBestRuns === newBestRuns) {
                newBestWickets = otherBestWickets || Math.max(0, newBestWickets - 1);
                newBestRuns = otherBestWickets > 0 ? otherBestRuns : Math.max(0, newBestRuns + 2);
              }

              // Fielding rollback
              const newCatches = Math.max(0, (currentStats.fielding?.catches || 0) - matchCatches);
              const newRunOuts = Math.max(0, (currentStats.fielding?.runOuts || 0) - matchRunOuts);
              const newStumpings = Math.max(0, (currentStats.fielding?.stumpings || 0) - matchStumpings);

              // Awards rollback
              const isPotm = id === matchToDelete.playerOfTheMatch;
              const isBBatter = id === matchToDelete.bestBatter;
              const isBBowler = id === matchToDelete.bestBowler;
              const isMvp = id === matchToDelete.mvp;

              const newPotm = Math.max(0, (currentStats.awards?.potm || 0) - (isPotm ? 1 : 0));
              const newBestBatter = Math.max(0, (currentStats.awards?.bestBatter || 0) - (isBBatter ? 1 : 0));
              const newBestBowler = Math.max(0, (currentStats.awards?.bestBowler || 0) - (isBBowler ? 1 : 0));
              const newMvpAward = Math.max(0, (currentStats.awards?.mvp || 0) - (isMvp ? 1 : 0));

              const awardBonus = (isPotm ? 15 : 0) + (isBBatter ? 10 : 0) + (isBBowler ? 10 : 0) + (isMvp ? 15 : 0);
              const newMvpPoints = Math.max(0, (currentStats.awards?.mvpPoints || 0) - (matchMvpPoints + awardBonus));

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
        }
      }

      await deleteDoc(doc(db, 'matches', matchId));
      setDeleteConfirmMatchId(null);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `matches/${matchId}`);
    }
  };

  const archivedMatches = matches.filter(m => m.status === 'completed' || m.status === 'aborted');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-sleek-panel border border-sleek-border p-5 rounded-2xl shadow-md">
        <div>
          <h3 className="font-extrabold text-sleek-accent text-sm uppercase tracking-wider">Match Archives</h3>
          <p className="text-xs text-sleek-text-muted">
            {archivedMatches.length} historical matches recorded on Madurai Cricket Veeragal.
          </p>
        </div>

        {archivedMatches.length === 0 && (
          <button
            onClick={handleSeedCompletedMatches}
            disabled={loadingDemo}
            className="w-full sm:w-auto px-4 py-2 bg-sleek-overlay hover:bg-sleek-accent hover:text-black hover:border-transparent text-sleek-text text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 border border-sleek-border transition cursor-pointer"
          >
            <Sparkles size={14} />
            {loadingDemo ? 'Seeding...' : 'Seed Mock Match Scorecard'}
          </button>
        )}
      </div>

      {archivedMatches.length === 0 ? (
        <div className="bg-sleek-card border border-sleek-border p-12 rounded-3xl text-center space-y-3">
          <Calendar className="mx-auto text-sleek-text/20" size={32} />
          <p className="text-sm text-sleek-text font-extrabold uppercase tracking-widest">No Match History Yet</p>
          <p className="text-xs text-sleek-text-muted max-w-sm mx-auto">Complete live scoring for an active match to see its full record here, or seed a mock completed scorecard above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedMatches.map((match) => {
            const isExpanded = expandedMatchId === match.id;
            const scoreFirst = match.scores[match.battingFirst || 'teamA'];
            const scoreSecond = match.scores[match.battingFirst === 'teamA' ? 'teamB' : 'teamA'];
            const firstTeamName = match.battingFirst === 'teamA' ? match.teamA.name : match.teamB.name;
            const secondTeamName = match.battingFirst === 'teamA' ? match.teamB.name : match.teamA.name;

            return (
              <div key={match.id} className="bg-sleek-card border border-sleek-border rounded-2xl shadow-sleek-xl overflow-hidden">
                {/* Match Summary Header */}
                <div
                  onClick={() => handleToggleExpand(match.id)}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-sleek-overlay transition"
                >
                  <div className="space-y-1.5 min-w-0">
                    <span className={`inline-block px-2.5 py-1 text-[9px] font-black tracking-widest uppercase rounded ${
                      match.status === 'aborted'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-sleek-overlay text-sleek-accent'
                    }`}>
                      {match.overs} OVERS FORMAT {match.status === 'aborted' && '• ABORTED'}
                    </span>
                    <h4 className="font-extrabold text-sleek-text text-sm flex items-center gap-1.5 truncate">
                      {firstTeamName} <ArrowRight size={12} className="text-sleek-accent" /> {secondTeamName}
                    </h4>
                    {match.status === 'aborted' ? (
                      <p className="text-xs text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Match Aborted / Incomplete
                      </p>
                    ) : (
                      <p className="text-xs text-sleek-accent font-black uppercase tracking-wider flex items-center gap-1">
                        <Trophy size={12} />
                        Winner: {match.winner === 'draw' ? 'Draw Match' : match.winner === 'teamA' ? match.teamA.name : match.teamB.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-sleek-border">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-black text-sleek-text-muted uppercase tracking-widest">Date</p>
                      <p className="text-xs text-sleek-text font-mono mt-0.5">
                        {new Date(match.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-sleek-text-muted" /> : <ChevronDown size={16} className="text-sleek-text-muted" />}
                  </div>
                </div>

                {/* Expanded Full Detailed Scorecard & Timeline */}
                {isExpanded && (
                  <div className="p-5 border-t border-sleek-border bg-sleek-panel/40 space-y-6">
                    {/* Share / Export / Admin Action Bar */}
                    <div className="flex flex-wrap gap-2 justify-end border-b border-sleek-border pb-4">
                      <button
                        onClick={() => handleShareSummary(match)}
                        disabled={sharing}
                        className="px-3 py-1.5 bg-sleek-overlay border border-sleek-border hover:bg-sleek-accent/20 hover:text-sleek-accent text-sleek-text text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Share2 size={12} /> Share Summary
                      </button>
                      <button
                        onClick={() => handlePrintScorecard(match.id)}
                        className="px-3 py-1.5 bg-sleek-overlay border border-sleek-border hover:bg-sleek-overlay-hover text-sleek-text-muted hover:text-sleek-text text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer size={12} /> Export Scorecard
                      </button>

                      {isAdminMode && match.status === 'aborted' && (
                        <button
                          onClick={() => setResumeConfirmMatch(match)}
                          className="px-3 py-1.5 bg-sleek-accent text-black hover:bg-sleek-accent/80 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Play size={12} /> Resume Match
                        </button>
                      )}

                      {isAdminMode && match.status !== 'completed' && (
                        <button
                          onClick={() => setDeleteConfirmMatchId(match.id)}
                          className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                        >
                          Delete Match
                        </button>
                      )}
                    </div>

                    {/* Team Innings details */}
                    <div className="space-y-6">
                      {/* Innings 1 Scorecard */}
                      <div className="bg-sleek-card border border-sleek-border p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex justify-between items-center border-b border-sleek-border pb-2">
                          <span className="text-xs font-black text-sleek-accent uppercase tracking-wider">{firstTeamName} Innings (1st)</span>
                          <span className="text-xs font-black text-sleek-text font-mono">{scoreFirst.runs}/{scoreFirst.wickets} <span className="text-xs text-sleek-text-muted font-normal font-sans">({match.overs} Ov)</span></span>
                        </div>
                        
                        {/* Batting performances */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block">Batting Summary</span>
                          {scoreFirst.batting.map(b => (
                            <div key={b.playerId} className="flex justify-between items-center text-xs p-2 bg-sleek-overlay rounded-lg border border-sleek-border">
                              <span className="font-bold text-sleek-text/90">{b.name}</span>
                              <span className="font-bold text-sleek-text-muted font-mono">
                                {b.runs} <span className="text-xs text-sleek-text-muted font-normal">({b.balls}b, {b.fours}x4, {b.sixes}x6)</span>
                                {b.dismissed && <span className="text-[9px] text-red-400 font-black uppercase tracking-wider ml-2 bg-red-400/10 px-1 py-0.5 rounded">Out</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Innings 2 Scorecard */}
                      <div className="bg-sleek-card border border-sleek-border p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex justify-between items-center border-b border-sleek-border pb-2">
                          <span className="text-xs font-black text-sleek-accent uppercase tracking-wider">{secondTeamName} Innings (2nd)</span>
                          <span className="text-xs font-black text-sleek-text font-mono">{scoreSecond.runs}/{scoreSecond.wickets} <span className="text-xs text-sleek-text-muted font-normal font-sans">({match.overs} Ov)</span></span>
                        </div>
                        
                        {/* Batting performances */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-black text-sleek-text-muted uppercase tracking-widest block">Batting Summary</span>
                          {scoreSecond.batting.map(b => (
                            <div key={b.playerId} className="flex justify-between items-center text-xs p-2 bg-sleek-overlay rounded-lg border border-sleek-border">
                              <span className="font-bold text-sleek-text/90">{b.name}</span>
                              <span className="font-bold text-sleek-text-muted font-mono">
                                {b.runs} <span className="text-xs text-sleek-text-muted font-normal">({b.balls}b, {b.fours}x4, {b.sixes}x6)</span>
                                {b.dismissed && <span className="text-[9px] text-red-400 font-black uppercase tracking-wider ml-2 bg-red-400/10 px-1 py-0.5 rounded">Out</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Timeline Log */}
                    {match.timeline && match.timeline.length > 0 && (
                      <div className="bg-sleek-card border border-sleek-border p-4 rounded-2xl space-y-3 shadow-md">
                        <span className="text-xs font-black text-sleek-text uppercase tracking-wider flex items-center gap-1">
                          <Zap size={14} className="text-sleek-accent" /> Match Timeline & Critical Events
                        </span>
                        <div className="divide-y divide-white/5 max-h-[200px] overflow-y-auto pr-1 space-y-2.5">
                          {match.timeline.map((event, idx) => (
                            <div key={idx} className="pt-2 text-xs text-sleek-text-muted space-y-1">
                              <span className="text-xs font-black text-sleek-accent font-mono uppercase tracking-widest">Over {event.overIndex}.{event.ballIndex}</span>
                              <p className="font-medium text-sleek-text-muted">{event.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Custom Resume Confirmation Modal */}
      {resumeConfirmMatch && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-sleek-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <Play size={24} />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-extrabold text-sleek-text text-base uppercase tracking-wider">Resume Scoring?</h4>
              <p className="text-xs text-sleek-text-muted leading-relaxed">
                Do you want to resume scoring this match: <strong>{resumeConfirmMatch.teamA.name} vs {resumeConfirmMatch.teamB.name}</strong>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResumeConfirmMatch(null)}
                className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-sleek-text text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResumeMatch(resumeConfirmMatch)}
                className="py-2.5 bg-sleek-accent text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-sleek-accent/80 transition cursor-pointer"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Custom Delete Match Confirmation Modal */}
      {deleteConfirmMatchId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-sleek-card border border-sleek-border rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-sleek-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-extrabold text-sleek-text text-base uppercase tracking-wider">Delete Match?</h4>
              <p className="text-xs text-sleek-text-muted leading-relaxed">
                Are you absolutely sure you want to permanently delete this match? This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMatchId(null)}
                className="py-2.5 bg-sleek-overlay hover:bg-sleek-overlay-hover border border-sleek-border text-[#E0E0E0] text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMatch(deleteConfirmMatchId)}
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
