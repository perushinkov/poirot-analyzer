import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutRouteComponent } from './layout-route.component';

describe('LayoutRouteComponent', () => {
  let component: LayoutRouteComponent;
  let fixture: ComponentFixture<LayoutRouteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayoutRouteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
