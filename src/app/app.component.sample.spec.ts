import {TestBed, async, ComponentFixture} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {AppComponent} from './app.component';

describe('AppComponent compilation test', () => {
  let actualValue, expectedValue;
  let componentUnderTest: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  describe('Class test', () => {
    Given(() => {
      TestBed.configureTestingModule({
        providers: [
          AppComponent
        ]
      });
      componentUnderTest = TestBed.get(AppComponent);
    });

    describe('INIT', () => {
      When(() => {
        actualValue = componentUnderTest.title;
      });

      Then(() => {
        expectedValue = 'poirot-analyzer';
        expect(actualValue).toEqual(expectedValue);
      });
    });
  });

  describe('With fixture', () => {
    Given(async(() => {
      TestBed.configureTestingModule({
        imports: [
          RouterTestingModule
        ],
        declarations: [
          AppComponent
        ],
      }).compileComponents();
    }));

    Given(() => {
      fixture = TestBed.createComponent(AppComponent);
      componentUnderTest = fixture.debugElement.componentInstance;
    });

    describe('should create the app', () => {
      Then(() => {
        expect(componentUnderTest).toBeTruthy();
      });
    });

    describe('should render title in a h1 tag', () => {
      When(() => {
        fixture.detectChanges();
        actualValue = fixture.debugElement.nativeElement.querySelector('h1').textContent;
      });

      Then(() => {
        expectedValue = 'Welcome to poirot-analyzer';
        expect(actualValue).toContain(expectedValue);
      });
    });
  });
});
