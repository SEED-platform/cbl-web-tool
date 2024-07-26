import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CblTableComponent } from './cbl-table.component';

describe('CblTableComponent', () => {
  let component: CblTableComponent;
  let fixture: ComponentFixture<CblTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CblTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CblTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
