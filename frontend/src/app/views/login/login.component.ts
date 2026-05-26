import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule, GridModule, AlertModule } from '@coreui/angular';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink, CardModule, GridModule, AlertModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly logoUrl = '/chmsu-min.jpg';

  /** Error message shown in the danger alert (from backend or Google redirect). */
  protected errorMessage: string | null = null;

  /** Success message shown after a successful registration redirect. */
  protected successMessage: string | null = null;

  /** True while the password-login HTTP request is in flight. */
  protected isLoading = false;

  /** Toggles the password input between text and password type. */
  protected showPassword = false;

  /** Reactive form for the email + password fields. */
  protected readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Shorthand getters so the template can read validation state cleanly. */
  protected get emailControl() {
    return this.loginForm.get('email');
  }
  protected get passwordControl() {
    return this.loginForm.get('password');
  }

  ngOnInit(): void {
    // The backend attaches ?error=... to the redirect URL on OAuth failure.
    // The register page attaches ?registered=true on successful account creation.
    this.route.queryParams.subscribe((params) => {
      if (params['error']) {
        this.errorMessage = params['error'];
      }
      if (params['registered'] === 'true') {
        this.successMessage = 'Account created successfully! You can now sign in.';
      }
    });
  }

  /** Dismiss the error alert manually. */
  protected dismissError(): void {
    this.errorMessage = null;
  }

  /** Dismiss the success alert manually. */
  protected dismissSuccess(): void {
    this.successMessage = null;
  }

  /** Toggle the password field between visible and hidden. */
  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Submits the email + password login form.
   *
   * Flow:
   *   1. Validate the form — if invalid, mark all fields as touched to show errors
   *   2. Call AuthService.loginWithCredentials() → POST /auth/password-login
   *   3. On success → navigate to /dashboard
   *   4. On error → display the backend error message in the alert
   */
  protected async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.authService.loginWithCredentials(email!, password!);
      await this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Pulls a human-readable message out of an Angular HttpErrorResponse.
   * Falls back to a generic message if the error shape is unexpected.
   */
  private extractErrorMessage(err: unknown): string {
    if (
      err !== null &&
      typeof err === 'object' &&
      'error' in err &&
      err.error !== null &&
      typeof err.error === 'object' &&
      'message' in err.error
    ) {
      return String((err as { error: { message: unknown } }).error.message);
    }
    return 'Login failed. Please check your credentials and try again.';
  }

  /**
   * Starts the Google OAuth login flow.
   * Redirects the browser to the backend Google auth endpoint.
   */
  protected loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
