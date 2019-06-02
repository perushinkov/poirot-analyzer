import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportRouteComponent } from './import-route.component';

describe('ImportRouteComponent', () => {
  let component: ImportRouteComponent;
  let fixture: ComponentFixture<ImportRouteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImportRouteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
