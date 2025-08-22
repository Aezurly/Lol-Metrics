import { Routes } from '@angular/router';
import { GlobalPlayerTable } from './global-player-table/global-player-table';
import { RecentScrims } from './recent-scrims/recent-scrims';

export const routes: Routes = [
  { path: '', redirectTo: '/players', pathMatch: 'full' },
  { path: 'players', component: GlobalPlayerTable },
  { path: 'scrims', component: RecentScrims },
  { path: '**', redirectTo: '/players' },
];
