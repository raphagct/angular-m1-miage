import { TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ZardSonnerService } from '@/shared/components/sonner';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TracksPageComponent } from './tracks-page';

// Le véritable service est conservé ; seul le transport HTTP est simulé.
describe('TracksPageComponent', () => {
  let component: TracksPageComponent;
  let http: HttpTestingController;
  const sonner = { success: vi.fn(), error: vi.fn() };
  const track = { id: '1', title: 'Test', originalName: 'test.mp3', mimeType: 'audio/mpeg', size: 100, createdAt: '2026-01-01' };
  const page = { items: [track], total: 1, page: 1, limit: 5, pages: 1 };

  beforeEach(() => {
    sonner.success.mockClear();
    sonner.error.mockClear();
    TestBed.configureTestingModule({
      imports: [TracksPageComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: ZardSonnerService, useValue: sonner }],
    });
    TestBed.overrideProvider(ZardSonnerService, { useValue: sonner });
    component = TestBed.createComponent(TracksPageComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/tracks?page=1&limit=5').flush(page);
  });

  afterEach(() => { http.verify(); vi.restoreAllMocks(); });

  it('supprime après confirmation, bloque un double appel et recharge la liste', () => {
    // La confirmation est maintenant gérée par le dialog, on simule l'action :
    component.confirmDelete(track);
    component.executeDelete();
    component.executeDelete();
    const req = http.expectOne('/api/tracks/1');
    expect(req.request.method).toBe('DELETE');
    expect(component.deleting().has('1')).toBe(true);
    req.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/tracks?page=1&limit=5').flush({ ...page, items: [], total: 0 });
    expect(component.tracks()).toEqual([]);
    expect(component.deleting().size).toBe(0);
    expect(sonner.success).toHaveBeenCalledWith('Piste supprimée avec succès');
  });

  it('revient à la dernière page disponible lorsque la page courante devient vide', () => {
    component.page.set(2);
    component.load();
    http.expectOne('/api/tracks?page=2&limit=5').flush({ ...page, items: [], total: 5 });
    expect(component.page()).toBe(1);
    http.expectOne('/api/tracks?page=1&limit=5').flush({ ...page, total: 5 });
    expect(component.tracks()).toEqual([track]);
  });

  it('ne supprime pas si la confirmation est annulée', () => {
    // Si on ouvre le dialogue mais qu'on annule (ici on ne fait pas executeDelete)
    component.confirmDelete(track);
    // component.executeDelete(); n'est pas appelé
    http.expectNone('/api/tracks/1');
    expect(component.deleting().size).toBe(0);
  });

  it.each([404, 403, 401])('affiche un SnackBar et libère la suppression après une erreur %s', status => {
    component.confirmDelete(track);
    component.executeDelete();
    http.expectOne('/api/tracks/1').flush({}, { status, statusText: 'Erreur' });
    http.expectOne('/api/tracks?page=1&limit=5').flush(page);
    expect(component.deleting().size).toBe(0);
    expect(sonner.error).toHaveBeenCalledWith(status === 404 ? "La piste n'existe plus ou ne vous appartient pas." : "Vous n'êtes pas autorisé à supprimer cette piste.");
  });

  it('affiche la progression intermédiaire et attend la réponse pour annoncer la réussite', () => {
    component.file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    component.title.setValue('Mon titre');
    component.upload();
    component.upload();
    const req = http.expectOne('/api/tracks');
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBe(true);
    expect(req.request.body.get('title')).toBe('Mon titre');
    expect(req.request.body.get('audio').name).toBe('test.mp3');
    expect(component.title.disabled).toBe(true);
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 100 });
    expect(component.uploadProgress()).toBe(50);
    expect(component.uploading()).toBe(true);
    expect(component.uploadSuccess()).toBeNull();
    req.flush(track, { status: 201, statusText: 'Created' });
    http.expectOne('/api/tracks?page=1&limit=5').flush(page);
    expect(component.uploading()).toBe(false);
    expect(component.title.enabled).toBe(true);
    expect(sonner.success).toHaveBeenCalledWith('Piste envoyée avec succès !');
    expect(component.file).toBeUndefined();
    expect(component.ghostFile()).toBeNull();
  });

  it('gère un échec d’upload et permet une nouvelle tentative', () => {
    component.file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    component.upload();
    http.expectOne('/api/tracks').flush({}, { status: 500, statusText: 'Server Error' });
    expect(sonner.error).toHaveBeenCalledWith("Erreur serveur lors de l'envoi.");
    expect(component.uploading()).toBe(false);
    expect(component.title.enabled).toBe(true);
    expect(component.file).toBeDefined();
    expect(component.ghostFile()).toBeNull();
  });

  it('affiche une erreur de chargement dans le template', () => {
    const fixture = TestBed.createComponent(TracksPageComponent);
    http.expectOne('/api/tracks?page=1&limit=5').flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Impossible de charger les pistes.');
  });
});
