import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CardModule, GridModule, AlertModule } from '@coreui/angular';

import { AuthService } from '../../core/services/auth.service';

// ─────────────────────────────────────────────────────────────
// Custom validators (plain functions — no class overhead needed)
// ─────────────────────────────────────────────────────────────

/**
 * Rejects emails that are not in the @chmsu.edu.ph domain.
 * Returns { chmsuDomain: true } when the domain is wrong.
 * Returns null (valid) when the value is empty — let Validators.required
 * handle the empty case so messages don't stack.
 */
function chmsuEmailValidator(control: AbstractControl): ValidationErrors | null {
  const email: string = (control.value ?? '').trim().toLowerCase();
  if (!email) return null;
  return email.endsWith('@chmsu.edu.ph') ? null : { chmsuDomain: true };
}

/**
 * Cross-field validator attached to the FormGroup.
 * Checks that password and confirmPassword have the same value.
 * Returns { passwordMismatch: true } when they differ.
 */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!password || !confirm) return null;
  return password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [RouterLink, CardModule, GridModule, AlertModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly logoUrl = '/chmsu-min.jpg';

  /** Backend or client error shown in the danger alert. */
  protected errorMessage: string | null = null;

  /** Short-lived token issued after a successful Google OAuth callback. */
  protected googleRegistrationToken: string | null = null;

  /** True while the backend resolves the Google registration token. */
  protected isVerifyingGoogle = false;

  /** True once the backend confirms this form is backed by a verified Google account. */
  protected hasVerifiedGoogleIdentity = false;

  /** True while the register HTTP request is in flight. */
  protected isLoading = false;

  /** Eye-toggle state for the password field. */
  protected showPassword = false;

  /** Eye-toggle state for the confirm-password field. */
  protected showConfirmPassword = false;

  /**
   * Reactive form for the registration fields.
   *
   * Validators applied:
   *   name            — required, min 3 characters
   *   email           — required, valid email format, must be @chmsu.edu.ph
   *   password        — required, min 8 characters (matches backend DTO)
   *   confirmPassword — required, must equal password (cross-field validator on the group)
   */
  protected readonly registerForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email, chmsuEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  // ── Shorthand getters so the template can read control errors cleanly ──
  protected get nameControl() {
    return this.registerForm.get('name');
  }
  protected get emailControl() {
    return this.registerForm.get('email');
  }
  protected get passwordControl() {
    return this.registerForm.get('password');
  }
  protected get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }

  async ngOnInit(): Promise<void> {
    const registrationToken = this.route.snapshot.queryParamMap.get('registration_token');

    if (!registrationToken) {
      return;
    }

    this.isVerifyingGoogle = true;
    this.errorMessage = null;

    try {
      const registrationContext =
        await this.authService.getGoogleRegistrationContext(registrationToken);

      this.googleRegistrationToken = registrationToken;
      this.hasVerifiedGoogleIdentity = true;
      this.registerForm.patchValue({
        name: registrationContext.name,
        email: registrationContext.email,
      });
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
      this.googleRegistrationToken = null;
      this.hasVerifiedGoogleIdentity = false;
    } finally {
      this.isVerifyingGoogle = false;
    }
  }

  /** Dismiss the error alert. */
  protected dismissError(): void {
    this.errorMessage = null;
  }

  /** Starts the Google OAuth flow used to verify a new account owner's email address. */
  protected verifyWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  /** Toggle password field between text and password type. */
  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /** Toggle confirm-password field between text and password type. */
  protected toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Submits the registration form.
   *
   * Flow:
   *   1. Validate — if invalid, mark all fields as touched so errors appear
   *   2. Call AuthService.register() → POST /auth/register
   *   3. On success → navigate to /login?registered=true
   *      The login page reads this param and shows a success banner.
   *   4. On error → display the backend error message in the alert
   */
  protected async register(): Promise<void> {
    if (!this.googleRegistrationToken) {
      this.errorMessage = 'Please verify your CHMSU email with Google before creating an account.';
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { name, email, password } = this.registerForm.getRawValue();

    try {
      await this.authService.register(name!, email!, password!, this.googleRegistrationToken);
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
    return 'Registration failed. Please verify with Google again and try once more.';
  }
}
