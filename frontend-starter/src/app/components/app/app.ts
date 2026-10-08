import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { ZardSonnerComponent } from '@/shared/components/sonner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMusic, lucideUser, lucideLogOut } from '@ng-icons/lucide';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ZardSonnerComponent, NgIcon],
  templateUrl: './app.html',
  styleUrl: './app.css',
  viewProviders: [provideIcons({ lucideMusic, lucideUser, lucideLogOut })],
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
