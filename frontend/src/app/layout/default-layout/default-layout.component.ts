import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DropdownModule, HeaderModule, INavData, SidebarModule } from '@coreui/angular';

import { navItems as baseNavItems } from './_nav';
import { AuthService } from '../../core/services/auth.service';
import { getUserInitials } from '../../shared/utils/user.utils';

@Component({
  selector: 'app-default-layout',
  imports: [RouterLink, RouterOutlet, DropdownModule, HeaderModule, SidebarModule],
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.scss',
})
export class DefaultLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly failedAvatarUrl = signal<string | null>(null);

  protected readonly logoUrl = '/chmsu-min.jpg';

  /**
   * Reactive signal: the currently logged-in user.
   * Automatically updates when the user logs in or out.
   * Used in the template to show the user's name and role.
   */
  protected readonly currentUser = this.authService.currentUser;

  protected readonly navItems = computed((): INavData[] => {
    const items = [...baseNavItems];

    if (this.currentUser()?.role === 'ADMIN') {
      items.push({
        name: 'User Management',
        url: '/admin/users',
      });
    }

    return items;
  });

  /**
   * A stable display label for the header.
   * Prefer the full name returned by GET /auth/me, then fall back to email.
   */
  protected readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'RBAP User';
    return user.name.trim() || user.email;
  });

  /**
   * Google profile photo URL returned by the backend, if available.
   * When this is null, the template falls back to the initials badge.
   */
  protected readonly avatarUrl = computed(() => {
    const avatar = this.currentUser()?.avatar?.trim();
    return avatar ? avatar : null;
  });

  protected readonly resolvedAvatarUrl = computed(() => {
    const avatar = this.avatarUrl();
    return avatar && avatar !== this.failedAvatarUrl() ? avatar : null;
  });

  /**
   * Computed signal: derives 1–2 letter initials from the user's full name.
   * Updates automatically when currentUser changes.
   * Example: "Mark Meguizo" → "MM"
   */
  protected readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return '?';
    return getUserInitials(user.name);
  });

  protected markHeaderAvatarBroken(): void {
    const avatar = this.avatarUrl();
    if (!avatar) {
      return;
    }

    this.failedAvatarUrl.set(avatar);
  }

  /**
   * Logs the user out and redirects to /login.
   * Clears tokens and user data from localStorage.
   */
  protected logout(): void {
    this.authService.logout();
  }
}
