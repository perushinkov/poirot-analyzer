import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InitRouteComponent } from './init-route.component';

describe('InitRouteComponent', () => {
  let component: InitRouteComponent;
  let fixture: ComponentFixture<InitRouteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InitRouteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InitRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
