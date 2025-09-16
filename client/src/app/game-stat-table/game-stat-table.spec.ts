import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameStatTable } from './game-stat-table';

describe('GameStatTable', () => {
  let component: GameStatTable;
  let fixture: ComponentFixture<GameStatTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameStatTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameStatTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
