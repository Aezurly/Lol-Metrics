import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerEvolutionChart } from './player-evolution-chart';

describe('PlayerEvolutionChart', () => {
  let component: PlayerEvolutionChart;
  let fixture: ComponentFixture<PlayerEvolutionChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerEvolutionChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerEvolutionChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
