import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RadarPlayerChart } from './radar-player-chart';

describe('RadarPlayerChart', () => {
  let component: RadarPlayerChart;
  let fixture: ComponentFixture<RadarPlayerChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadarPlayerChart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RadarPlayerChart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
