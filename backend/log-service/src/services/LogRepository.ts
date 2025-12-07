import * as fs from "fs";
import * as path from "path";
import {
  GameEndEvent,
  GameLog,
  GameMoveEvent,
  GameStartEvent,
} from "../types/game";

export class LogRepository {
  private logFilePath: string;
  private logs: GameLog[] = [];

  constructor(logDirectory: string = "/app/logs") {
    if (!fs.existsSync(logDirectory)) {
      fs.mkdirSync(logDirectory, { recursive: true });
    }
    this.logFilePath = path.join(logDirectory, "game-logs.json");
    this.loadLogs();
  }

  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const fileContent = fs.readFileSync(this.logFilePath, "utf-8");
        const loadedLogs = JSON.parse(fileContent);
        this.logs = loadedLogs.map((log: any) => ({
          game: log.game,
          start: log.start,
          moves: log.moves || [],
          end: log.end,
        }));
        this.saveLogs();
      } else {
        this.logs = [];
      }
    } catch (error) {
      console.error("❌ Error loading logs:", error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      const orderedLogs = this.logs.map((log) => ({
        game: log.game,
        start: log.start,
        moves: log.moves,
        end: log.end,
      }));
      const jsonContent = JSON.stringify(orderedLogs, null, 2);
      fs.writeFileSync(this.logFilePath, jsonContent, "utf-8");
    } catch (error) {
      console.error("❌ Error saving logs:", error);
    }
  }

  private findOrCreateGameLog(matchId: string): GameLog {
    let gameLog = this.logs.find((log) => log.game === matchId);
    if (!gameLog) {
      gameLog = {
        game: matchId,
        start: undefined,
        moves: [],
        end: undefined,
      };
      this.logs.push(gameLog);
    }
    return gameLog;
  }

  public logGameStart(event: GameStartEvent): void {
    const gameLog = this.findOrCreateGameLog(event.matchId);
    gameLog.start = event;
    this.saveLogs();
  }

  public logGameMove(event: GameMoveEvent): void {
    const gameLog = this.findOrCreateGameLog(event.matchId);
    gameLog.moves.push(event);
    this.saveLogs();
  }

  public logGameEnd(event: GameEndEvent): void {
    const gameLog = this.findOrCreateGameLog(event.matchId);
    gameLog.end = event;
    this.saveLogs();
  }

  public getGameLogs(): GameLog[] {
    return this.logs;
  }

  public getGameLog(matchId: string): GameLog | undefined {
    return this.logs.find((log) => log.game === matchId);
  }

  public getLogStats(): {
    totalGames: number;
    completedGames: number;
    totalMoves: number;
  } {
    const totalGames = this.logs.length;
    const completedGames = this.logs.filter(
      (log) => log.start && log.end,
    ).length;
    const totalMoves = this.logs.reduce(
      (sum, log) => sum + log.moves.length,
      0,
    );
    return { totalGames, completedGames, totalMoves };
  }
}
