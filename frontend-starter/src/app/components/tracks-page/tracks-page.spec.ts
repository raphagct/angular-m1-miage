import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TracksPageComponent } from './tracks-page';
import { TrackService } from '../../shared/services/track.service';
import { of } from 'rxjs';
import { HttpEventType, HttpResponse, HttpProgressEvent } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Track } from '../../shared/models/track.model';

describe('TracksPageComponent', () => {
  let component: TracksPageComponent;
  let fixture: ComponentFixture<TracksPageComponent>;
  let mockTrackService: any;

  beforeEach(async () => {
    mockTrackService = {
      list: () => of({ items: [], total: 0 }),
      upload: () => of(),
      audio: () => of(new Blob()),
      delete: () => of(null)
    };
    mockTrackService.list = Object.assign(mockTrackService.list, { calls: { count: () => 0 } });
    mockTrackService.upload = Object.assign(mockTrackService.upload, { calls: { argsFor: () => [] } });

    await TestBed.configureTestingModule({
      imports: [TracksPageComponent],
      providers: [
        { provide: TrackService, useValue: mockTrackService },
        provideNoopAnimations(),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TracksPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle upload progress events and ghost card', () => {
    const mockFile = new File([''], 'test.mp3', { type: 'audio/mp3' });
    const mockTrack: Track = { id: '1', title: 'Test', originalName: 'test.mp3', mimeType: 'audio/mp3', size: 0, createdAt: new Date().toISOString() };
    
    component.file = mockFile;
    component.title.setValue('My Song');
    
    const progressEvent: HttpProgressEvent = { type: HttpEventType.UploadProgress, loaded: 50, total: 100 };
    const responseEvent = new HttpResponse({ body: mockTrack });
    
    
    let uploadCalledWith: any[] = [];
    mockTrackService.upload = (f: any, t: any) => {
      uploadCalledWith = [f, t];
      return of(progressEvent, responseEvent);
    };
    
    let listCalls = 0;
    mockTrackService.list = () => {
      listCalls++;
      return of({ items: [], total: 0 });
    };

    component.upload();
    
    expect(uploadCalledWith).toEqual([mockFile, 'My Song']);
    
    // As 'of' emits synchronously, we check the final state after response
    expect(component.uploadSuccess()).toEqual('Piste envoyée avec succès !');
    expect(component.ghostFile()).toBeNull();
    expect(component.title.value).toEqual('');
    expect(component.file).toBeUndefined();
    
    // 1 call to list from upload success (the constructor call happened before we wrapped the function)
    expect(listCalls).toBe(1); 
  });
});
