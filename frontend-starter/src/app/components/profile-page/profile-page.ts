import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSonnerService } from '@/shared/components/sonner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUser, lucideSave } from '@ng-icons/lucide';
import { ZardCardImports } from '@/shared/components/card/card.imports';

@Component({
  imports: [
    ReactiveFormsModule,
    ZardButtonComponent,
    ...ZardCardImports,
    NgIcon
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
  viewProviders: [provideIcons({ lucideUser, lucideSave })]
})
export class ProfilePageComponent {
  readonly auth = inject(AuthService);
  private readonly sonner = inject(ZardSonnerService);
  
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  
  readonly loading = signal(false);
  readonly saving = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.auth.profile().subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil chargé', user.id);
        this.form.setValue({ name: user.name });
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[ProfilePage] Chargement impossible', error);
        this.sonner.error('Impossible de charger le profil.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.auth.update(this.form.getRawValue().name).subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil enregistré', user.id);
        this.sonner.success('Profil mis à jour avec succès.');
        this.saving.set(false);
      },
      error: (error) => {
        console.error('[ProfilePage] Enregistrement impossible', error);
        this.sonner.error('Impossible de mettre à jour le profil.');
        this.saving.set(false);
      },
    });
  }
}
