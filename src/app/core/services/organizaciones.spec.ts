import { TestBed } from '@angular/core/testing';
import { Organizaciones } from './organizaciones';

describe('Organizaciones', () => {
  let service: Organizaciones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Organizaciones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
