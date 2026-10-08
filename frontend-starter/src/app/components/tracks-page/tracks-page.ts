import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardImports } from '@/shared/components/card/card.imports';
import { ZardProgressComponent } from '@/shared/components/progress';
import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardSeparatorComponent } from '@/shared/components/separator';
import { ZardDialogImports } from '@/shared/components/dialog/dialog.imports';
import { ZardSonnerService } from '@/shared/components/sonner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideUpload,
  lucidePlay,
  lucideTrash2,
  lucideRefreshCw,
  lucideMusic,
  lucideChevronLeft,
  lucideChevronRight,
  lucideFile,
  lucidePause,
} from '@ng-icons/lucide';

@Component({
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    ZardButtonComponent,
    ...ZardCardImports,
    ZardProgressComponent,
    ZardBadgeComponent,
    ...ZardDialogImports,
    NgIcon,
  ],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
  viewProviders: [
    provideIcons({
      lucideUpload,
      lucidePlay,
      lucideTrash2,
      lucideRefreshCw,
      lucideMusic,
      lucideChevronLeft,
      lucideChevronRight,
      lucideFile,
      lucidePause,
    }),
  ],
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sonner = inject(ZardSonnerService);

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
  readonly uploadProgress = signal(0);
  readonly ghostFile = signal<File | null>(null);

  readonly currentTrack = signal<Track | null>(null);
  readonly playError = signal<string | null>(null);
  readonly deleting = signal<Set<string>>(new Set());

  /** Delete confirmation dialog state */
  readonly deleteDialogVisible = signal(false);
  readonly trackToDelete = signal<Track | null>(null);

  /** Drag-and-drop state */
  readonly isDragging = signal(false);

  file?: File;

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => {
      if (this.audioUrl()) URL.revokeObjectURL(this.audioUrl());
    });
  }

  choose(event: Event): void {
    if (this.uploading()) return;
    this.uploadProgress.set(0);
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

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (this.uploading()) return;

    const droppedFile = event.dataTransfer?.files[0];
    if (!droppedFile) return;

    this.uploadProgress.set(0);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);

    if (!droppedFile.type.startsWith('audio/')) {
      this.uploadError.set('Le fichier doit être un format audio.');
      return;
    }

    if (droppedFile.size > 25 * 1024 * 1024) {
      this.uploadError.set('Le fichier ne doit pas dépasser 25 Mo.');
      return;
    }

    this.file = droppedFile;
    console.debug('[TracksPage] Fichier droppé', this.file.name);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list(this.page(), this.limit()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        const lastPage = Math.max(1, Math.ceil(response.total / this.limit()));
        if (this.page() > lastPage) {
          this.page.set(lastPage);
          this.load();
          return;
        }
        this.tracks.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[TracksPage] Chargement impossible');
        this.error.set('Impossible de charger les pistes.');
        this.loading.set(false);
      },
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  go(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page.set(page);
    this.load();
  }

  upload(): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.title.disable();
    this.uploadError.set(null);
    this.uploadSuccess.set(null);

    this.uploadProgress.set(0);
    this.ghostFile.set(this.file);

    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
          }
        } else if (event.type === HttpEventType.Response) {
          console.debug('[TracksPage] Piste envoyée', event.body?.id);
          this.sonner.success('Piste envoyée avec succès !');
          this.title.setValue('');
          this.file = undefined;
          this.ghostFile.set(null);
          this.uploading.set(false);
          this.title.enable();
          this.page.set(1);
          this.load();
        }
      },
      error: (error) => {
        console.error('[TracksPage] Envoi impossible');
        this.sonner.error('Erreur serveur lors de l\'envoi.');
        this.uploading.set(false);
        this.title.enable();
        this.ghostFile.set(null);
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
        console.error('[TracksPage] Lecture impossible');
        this.playError.set('Impossible de lire la piste.');
      }
    });
  }

  /** Open delete confirmation dialog */
  confirmDelete(track: Track): void {
    this.trackToDelete.set(track);
    this.deleteDialogVisible.set(true);
  }

  /** Execute deletion after confirmation */
  executeDelete(): void {
    const track = this.trackToDelete();
    if (!track) return;

    this.deleteDialogVisible.set(false);

    if (this.deleting().has(track.id)) return;

    const currentDeleting = new Set(this.deleting());
    currentDeleting.add(track.id);
    this.deleting.set(currentDeleting);

    this.service.delete(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée', track.id);
        this.sonner.success('Piste supprimée avec succès');
        const updatedDeleting = new Set(this.deleting());
        updatedDeleting.delete(track.id);
        this.deleting.set(updatedDeleting);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        console.error('[TracksPage] Suppression impossible', err.status);
        let errorMessage = 'Impossible de supprimer la piste.';
        if (err.status === 404) {
          errorMessage = "La piste n'existe plus ou ne vous appartient pas.";
        } else if (err.status === 403 || err.status === 401) {
          errorMessage = 'Vous n\'êtes pas autorisé à supprimer cette piste.';
        }
        this.sonner.error(errorMessage);

        const updatedDeleting = new Set(this.deleting());
        updatedDeleting.delete(track.id);
        this.deleting.set(updatedDeleting);
        this.load(); // Le backend renvoie aussi 404 si le propriétaire ne correspond pas.
      }
    });
  }
}
