import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule, GridModule } from '@coreui/angular';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, CardModule, GridModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  // Inject AuthService — this is where the actual login logic lives
  private readonly authService = inject(AuthService);

  protected readonly logoUrl = '/chmsu-min.jpg';

  /**
   * Starts the Google OAuth login flow.
   * Redirects the browser to the backend Google auth endpoint.
   * After the user signs in, the backend redirects back to /#/auth/callback.
   */
  protected loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
