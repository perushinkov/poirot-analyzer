import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent compilation test', () => {
  let actualValue, expectedValue;
  let componentUnderTest: AppComponent;
  let fixture;

  describe('Class test', () => {
  // TODO:
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

    describe('should have as title "poirot-analyzer"', () => {
      When(() => {
        actualValue = componentUnderTest.title;
      });

      Then(() => {
        expectedValue = 'poirot-analyzer';
        expect(actualValue).toEqual(expectedValue);
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
