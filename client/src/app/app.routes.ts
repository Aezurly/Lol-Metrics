import { Routes } from '@angular/router';
import { GlobalPlayerTable } from './global-player-table/global-player-table';
import { RecentScrims } from './recent-scrims/recent-scrims';
import { ScrimExplorer } from './scrim-explorer/scrim-explorer';

export const routes: Routes = [
  { path: '', redirectTo: '/players', pathMatch: 'full' },
  { path: 'players', component: GlobalPlayerTable },
  { path: 'recent-scrims', component: RecentScrims },
  { path: 'scrims', component: ScrimExplorer },
  { path: '**', redirectTo: '/players' },
];
