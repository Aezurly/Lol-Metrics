import { Routes } from '@angular/router';
import { GlobalPlayerTable } from './global-player-table/global-player-table';
import { RecentScrims } from './recent-scrims/recent-scrims';
import { ScrimExplorer } from './scrim-explorer/scrim-explorer';
import { PlayerPage } from './player-page/player-page';

export const routes: Routes = [
  { path: '', redirectTo: '/players', pathMatch: 'full' },
  { path: 'players', component: GlobalPlayerTable },
  { path: 'recent-blocks', component: RecentScrims },
  { path: 'blocks', component: ScrimExplorer },
  { path: 'player/:name', component: PlayerPage },
  { path: '**', redirectTo: '/players' },
];
