import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertModule, CardModule, GridModule } from '@coreui/angular';

import { AuthService } from '../../core/services/auth.service';
import { matchingFieldsValidator } from '../../shared/utils/form.validators';
import { formatUserRole, getUserInitials } from '../../shared/utils/user.utils';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, AlertModule, CardModule, GridModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly failedAvatarUrl = signal<string | null>(null);

  protected readonly currentUser = this.authService.currentUser;

  protected readonly avatarUrl = computed(() => {
    const avatar = this.currentUser()?.avatar?.trim();
    return avatar ? avatar : null;
  });

  protected readonly resolvedAvatarUrl = computed(() => {
    const avatar = this.avatarUrl();
    return avatar && avatar !== this.failedAvatarUrl() ? avatar : null;
  });

  protected readonly userInitials = computed(() => {
    return getUserInitials(this.currentUser()?.name ?? '');
  });

  protected markProfileAvatarBroken(): void {
    const avatar = this.avatarUrl();
    if (!avatar) {
      return;
    }

    this.failedAvatarUrl.set(avatar);
  }

  protected readonly roleLabel = computed(() => {
    const role = this.currentUser()?.role;
    return role ? formatUserRole(role) : 'Unknown role';
  });

  protected readonly passwordActionLabel = computed(() => {
    return this.currentUser()?.hasPassword ? 'Change password' : 'Set password';
  });

  protected successMessage: string | null = null;
  protected errorMessage: string | null = null;
  protected isSubmitting = false;
  protected showPassword = false;
  protected showConfirmPassword = false;

  protected readonly passwordForm = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: matchingFieldsValidator('password', 'confirmPassword', 'passwordMismatch'),
    },
  );

  protected get passwordControl() {
    return this.passwordForm.get('password');
  }

  protected get confirmPasswordControl() {
    return this.passwordForm.get('confirmPassword');
  }

  protected dismissSuccess(): void {
    this.successMessage = null;
  }

  protected dismissError(): void {
    this.errorMessage = null;
  }

  protected togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  protected async savePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    this.successMessage = null;

    const hadPassword = !!this.currentUser()?.hasPassword;
    const { password } = this.passwordForm.getRawValue();

    try {
      await this.authService.setPassword(password!);
      this.passwordForm.reset();
      this.showPassword = false;
      this.showConfirmPassword = false;
      this.successMessage = hadPassword
        ? 'Password updated successfully.'
        : 'Password saved successfully. You can now sign in with email and password.';
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isSubmitting = false;
    }
  }

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

    if (err instanceof Error && err.message) {
      return err.message;
    }

    return 'Unable to update your password right now.';
  }
}
