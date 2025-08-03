import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player, Team } from '@common/interfaces/match';

// Interface spécifique au serveur pour le résumé de l'application
interface AppSummary {
  matchIds: string[];
  playerList: Player[];
  teamList: Team[];
}

@Injectable({
  providedIn: 'root',
})
export class Communication {
  private readonly apiUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  /**
   * Get application summary with all matches, players, and teams
   */
  getSummary(): Observable<AppSummary> {
    return this.http.get<AppSummary>(this.apiUrl);
  }

  /**
   * Reload matches data
   */
  reloadMatches(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reload`, {});
  }

  /**
   * Reload teams data
   */
  reloadTeams(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/reload-teams`,
      {}
    );
  }

  /**
   * Reload all data (teams and matches)
   */
  reloadAll(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reload-all`, {});
  }
}
