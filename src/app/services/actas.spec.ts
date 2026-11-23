import { TestBed } from '@angular/core/testing';
import { Actas } from './actas';

describe('Actas', () => {
  let service: Actas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Actas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
