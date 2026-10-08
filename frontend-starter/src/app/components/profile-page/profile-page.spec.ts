import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfilePageComponent } from './profile-page';
import { AuthService } from '../../shared/services/auth.service';
import { ZardSonnerService } from '@/shared/components/sonner';

describe('ProfilePageComponent', () => {
  let component: ProfilePageComponent;
  let authServiceMock: any;
  let sonnerMock: any;

  beforeEach(async () => {
    authServiceMock = {
      profile: vi.fn().mockReturnValue(of({ id: '1', name: 'John Doe', email: 'john@example.com' })),
      update: vi.fn().mockReturnValue(of({ id: '1', name: 'John Updated' })),
      currentUser: vi.fn().mockReturnValue({ email: 'john@example.com' })
    };

    sonnerMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ZardSonnerService, useValue: sonnerMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
  });

  it('should load profile on init', () => {
    expect(authServiceMock.profile).toHaveBeenCalled();
    expect(component.form.value.name).toBe('John Doe');
    expect(component.loading()).toBe(false);
  });

  it('should handle load error', () => {
    authServiceMock.profile.mockReturnValue(throwError(() => new Error('Error')));
    
    // Create new component instance to trigger constructor/load with error mock
    const fixture = TestBed.createComponent(ProfilePageComponent);
    const comp = fixture.componentInstance;

    expect(sonnerMock.error).toHaveBeenCalledWith('Impossible de charger le profil.');
    expect(comp.loading()).toBe(false);
  });

  it('should save valid profile', () => {
    component.form.setValue({ name: 'John Updated' });
    component.save();

    expect(authServiceMock.update).toHaveBeenCalledWith('John Updated');
    expect(sonnerMock.success).toHaveBeenCalledWith('Profil mis à jour avec succès.');
    expect(component.saving()).toBe(false);
  });

  it('should handle save error', () => {
    authServiceMock.update.mockReturnValue(throwError(() => new Error('Save Error')));
    
    component.form.setValue({ name: 'John Updated' });
    component.save();

    expect(authServiceMock.update).toHaveBeenCalled();
    expect(sonnerMock.error).toHaveBeenCalledWith('Impossible de mettre à jour le profil.');
    expect(component.saving()).toBe(false);
  });

  it('should not save if form is invalid', () => {
    component.form.setValue({ name: '' }); // Invalid because of required validator
    component.save();

    expect(authServiceMock.update).not.toHaveBeenCalled();
  });
});
