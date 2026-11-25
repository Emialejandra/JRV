import { TestBed } from '@angular/core/testing';
import { VeedoresServices } from './veedores.service';

describe('VeedoresServices', () => {
  let service: VeedoresServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VeedoresServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
