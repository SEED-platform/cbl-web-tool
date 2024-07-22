import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirstTableComponent } from './first-table.component';

describe('FirstTableComponent', () => {
  let component: FirstTableComponent;
  let fixture: ComponentFixture<FirstTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FirstTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
