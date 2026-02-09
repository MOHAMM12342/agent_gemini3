import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Spectrogram } from './spectrogram';

describe('Spectrogram', () => {
  let component: Spectrogram;
  let fixture: ComponentFixture<Spectrogram>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Spectrogram]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Spectrogram);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
