import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

@Component({
  imports: [ReactiveFormsModule, MatPaginatorModule, DatePipe, DecimalPipe],
  templateUrl: './tracks-page.html', 
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly limit = signal(5);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly audioUrl = signal('');
  readonly title = new FormControl('', { nonNullable: true });
  
  readonly uploadError = signal<string | null>(null);
  readonly uploadSuccess = signal<string | null>(null);
  readonly uploading = signal(false);
  
  readonly currentTrack = signal<Track | null>(null);
  readonly playError = signal<string | null>(null);

  file?: File;

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => {
      if (this.audioUrl()) URL.revokeObjectURL(this.audioUrl());
    });
  }

  choose(event: Event): void {
    this.uploadError.set(null);
    this.uploadSuccess.set(null);
    this.file = (event.target as HTMLInputElement).files?.[0];
    
    if (!this.file) return;

    if (!this.file.type.startsWith('audio/')) {
      this.uploadError.set('Le fichier doit être un format audio.');
      this.file = undefined;
      return;
    }

    if (this.file.size > 25 * 1024 * 1024) {
      this.uploadError.set('Le fichier ne doit pas dépasser 25 Mo.');
      this.file = undefined;
      return;
    }

    console.debug('[TracksPage] Fichier valide', this.file.name);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.page(), this.limit()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set('Impossible de charger les pistes.');
        this.loading.set(false);
      },
    });
  }

  go(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  upload(): void {
    if (!this.file) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);

    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (track) => {
        console.debug('[TracksPage] Piste envoyée', track.id);
        this.uploadSuccess.set('Piste envoyée avec succès !');
        this.title.setValue('');
        this.file = undefined;
        this.uploading.set(false);
        this.page.set(1);
        this.load();
      },
      error: (error) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploadError.set('Erreur serveur lors de l\'envoi.');
        this.uploading.set(false);
      },
    });
  }

  play(track: Track): void {
    this.currentTrack.set(track);
    this.playError.set(null);

    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (error) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.playError.set('Impossible de lire la piste.');
      }
    });
  }

  delete(track: Track): void {
    if (!confirm(`Voulez-vous vraiment supprimer la piste "${track.title}" ?`)) {
      return;
    }
    this.service.delete(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée', track.id);
        this.load();
      },
      error: (error) => {
        console.error('[TracksPage] Suppression impossible', error);
        this.error.set('Impossible de supprimer la piste.');
      }
    });
  }
}
