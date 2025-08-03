import { Routes } from '@angular/router';
import { GlobalPlayerTable } from './global-player-table/global-player-table';

export const routes: Routes = [
  { path: '', redirectTo: '/players', pathMatch: 'full' },
  { path: 'players', component: GlobalPlayerTable },
  { path: '**', redirectTo: '/players' },
];
