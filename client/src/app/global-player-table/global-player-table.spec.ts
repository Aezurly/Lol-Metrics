import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalPlayerTable } from './global-player-table';

describe('GlobalPlayerTable', () => {
  let component: GlobalPlayerTable;
  let fixture: ComponentFixture<GlobalPlayerTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalPlayerTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalPlayerTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
