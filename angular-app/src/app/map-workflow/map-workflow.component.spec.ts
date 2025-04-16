import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapWorkflowComponent } from './map-workflow.component';

describe('MapWorkflowComponent', () => {
  let component: MapWorkflowComponent;
  let fixture: ComponentFixture<MapWorkflowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapWorkflowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapWorkflowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
