import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertModule,
  AvatarModule,
  BadgeModule,
  CardModule,
  GridModule,
  ListGroupModule,
  ModalModule,
} from '@coreui/angular';

import { OfficeService } from '../../../core/services/office.service';
import { UserService } from '../../../core/services/user.service';
import { chmsuEmailValidator } from '../../../shared/utils/form.validators';
import { formatUserRole, getUserInitials } from '../../../shared/utils/user.utils';
import { UserRole } from '../../../types/auth.types';
import { OfficeSummary } from '../../../types/office.types';
import { ManagedUser } from '../../../types/user.types';

const ROLE_OPTIONS: UserRole[] = [
  'ADMIN',
  'PRESIDENTS',
  'VICE_PRESIDENTS',
  'DIRECTORS',
  'OFFICE_HEAD',
];

@Component({
  selector: 'app-users',
  imports: [
    ReactiveFormsModule,
    AlertModule,
    AvatarModule,
    BadgeModule,
    CardModule,
    GridModule,
    ListGroupModule,
    ModalModule,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly officeService = inject(OfficeService);
  private readonly fb = inject(FormBuilder);
  private readonly brokenAvatarKeys = signal<Record<string, true>>({});

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly formatUserRole = formatUserRole;

  protected users: ManagedUser[] = [];
  protected usersWithoutOffice: ManagedUser[] = [];
  protected offices: OfficeSummary[] = [];
  protected lookupUser: ManagedUser | null = null;
  protected selectedUser: ManagedUser | null = null;

  protected take = 20;
  protected skip = 0;
  protected isLoading = true;
  protected isSubmitting = false;
  protected isLookupLoading = false;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;

  protected createModalVisible = false;
  protected assignOfficeModalVisible = false;
  protected changeRoleModalVisible = false;
  protected deleteModalVisible = false;
  protected userPendingDelete: ManagedUser | null = null;

  protected readonly lookupByIdForm = this.fb.group({
    userId: ['', [Validators.required]],
  });

  protected readonly lookupByEmailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, chmsuEmailValidator]],
  });

  protected readonly createUserForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email, chmsuEmailValidator]],
    role: ['OFFICE_HEAD' as UserRole, [Validators.required]],
    officeId: [''],
  });

  protected readonly assignOfficeForm = this.fb.group({
    officeId: [''],
  });

  protected readonly changeRoleForm = this.fb.group({
    role: ['OFFICE_HEAD' as UserRole, [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  protected dismissSuccess(): void {
    this.successMessage = null;
  }

  protected dismissError(): void {
    this.errorMessage = null;
  }

  protected async previousPage(): Promise<void> {
    if (this.skip === 0 || this.isLoading) {
      return;
    }

    this.skip = Math.max(0, this.skip - this.take);
    await this.loadUsers();
  }

  protected async nextPage(): Promise<void> {
    if (this.isLoading || this.users.length < this.take) {
      return;
    }

    this.skip += this.take;
    await this.loadUsers();
  }

  protected async searchById(): Promise<void> {
    if (this.lookupByIdForm.invalid) {
      this.lookupByIdForm.markAllAsTouched();
      return;
    }

    this.isLookupLoading = true;
    this.errorMessage = null;

    try {
      this.lookupUser = await this.userService.getUserById(
        this.lookupByIdForm.getRawValue().userId!,
      );
    } catch (err: unknown) {
      this.lookupUser = null;
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isLookupLoading = false;
    }
  }

  protected async searchByEmail(): Promise<void> {
    if (this.lookupByEmailForm.invalid) {
      this.lookupByEmailForm.markAllAsTouched();
      return;
    }

    this.isLookupLoading = true;
    this.errorMessage = null;

    try {
      this.lookupUser = await this.userService.getUserByEmail(
        this.lookupByEmailForm.getRawValue().email!,
      );
    } catch (err: unknown) {
      this.lookupUser = null;
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isLookupLoading = false;
    }
  }

  protected clearLookup(): void {
    this.lookupUser = null;
    this.lookupByIdForm.reset();
    this.lookupByEmailForm.reset();
  }

  protected openCreateModal(): void {
    this.createUserForm.reset({
      name: '',
      email: '',
      role: 'OFFICE_HEAD',
      officeId: '',
    });
    this.createModalVisible = true;
  }

  protected closeCreateModal(): void {
    this.createModalVisible = false;
  }

  protected openAssignOfficeModal(user: ManagedUser): void {
    this.selectedUser = user;
    this.assignOfficeForm.reset({ officeId: user.office?.id ?? '' });
    this.assignOfficeModalVisible = true;
  }

  protected closeAssignOfficeModal(): void {
    this.assignOfficeModalVisible = false;
    this.selectedUser = null;
  }

  protected openChangeRoleModal(user: ManagedUser): void {
    this.selectedUser = user;
    this.changeRoleForm.reset({ role: user.role });
    this.changeRoleModalVisible = true;
  }

  protected closeChangeRoleModal(): void {
    this.changeRoleModalVisible = false;
    this.selectedUser = null;
  }

  protected openDeleteModal(user: ManagedUser): void {
    this.userPendingDelete = user;
    this.deleteModalVisible = true;
  }

  protected closeDeleteModal(): void {
    this.deleteModalVisible = false;
    this.userPendingDelete = null;
  }

  protected async createUser(): Promise<void> {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const { name, email, role, officeId } = this.createUserForm.getRawValue();

    try {
      await this.userService.createUser({
        name: name!,
        email: email!,
        role: role!,
        officeId: officeId || undefined,
      });
      this.successMessage = 'User created successfully.';
      this.closeCreateModal();
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async assignOffice(): Promise<void> {
    if (!this.selectedUser) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const officeId = this.assignOfficeForm.getRawValue().officeId?.trim() || undefined;

      await this.userService.assignOffice({
        userId: this.selectedUser.id,
        officeId,
      });
      this.successMessage = officeId ? 'Office assignment updated.' : 'Office assignment cleared.';
      this.closeAssignOfficeModal();
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async changeRole(): Promise<void> {
    if (this.changeRoleForm.invalid || !this.selectedUser) {
      this.changeRoleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      await this.userService.assignRole({
        userId: this.selectedUser.id,
        role: this.changeRoleForm.getRawValue().role!,
      });
      this.successMessage = 'User role updated successfully.';
      this.closeChangeRoleModal();
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async toggleStatus(user: ManagedUser): Promise<void> {
    this.errorMessage = null;
    this.successMessage = null;

    try {
      const updatedUser = await this.userService.changeStatus(user.id);
      this.successMessage = `${updatedUser.name} is now ${updatedUser.status}.`;
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    }
  }

  protected async promoteToDirector(user: ManagedUser): Promise<void> {
    if (user.status !== 'ACTIVE' || user.role === 'DIRECTORS') {
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;

    try {
      await this.userService.assignRole({
        userId: user.id,
        role: 'DIRECTORS',
      });
      this.successMessage = `${user.name} is now assigned as a Director.`;
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    }
  }

  protected async restoreUser(user: ManagedUser): Promise<void> {
    if (user.status !== 'INACTIVE') {
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;

    try {
      const restoredUser = await this.userService.changeStatus(user.id);
      this.successMessage = `${restoredUser.name} was restored. Reassign office and head responsibilities if needed.`;
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    }
  }

  protected async softDeleteSelectedUser(): Promise<void> {
    if (!this.userPendingDelete) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const deletedUser = await this.userService.deleteUser(this.userPendingDelete.id);
      this.successMessage = `${deletedUser.name} was soft deleted and can no longer sign in.`;
      this.closeDeleteModal();
      await this.reloadData();
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isSubmitting = false;
    }
  }

  protected hasUsableAvatar(user: ManagedUser | null): boolean {
    if (!user?.avatar?.trim()) {
      return false;
    }

    return !this.brokenAvatarKeys()[this.avatarKey(user)];
  }

  protected markAvatarBroken(user: ManagedUser): void {
    const key = this.avatarKey(user);

    this.brokenAvatarKeys.update((current) => {
      if (current[key]) {
        return current;
      }

      return {
        ...current,
        [key]: true,
      };
    });
  }

  protected initialsForUser(user: Pick<ManagedUser, 'name'>): string {
    return getUserInitials(user.name);
  }

  protected roleBadgeColor(
    role: UserRole,
  ): 'warning' | 'info' | 'primary' | 'success' | 'secondary' {
    switch (role) {
      case 'ADMIN':
        return 'warning';
      case 'PRESIDENTS':
        return 'success';
      case 'VICE_PRESIDENTS':
        return 'info';
      case 'DIRECTORS':
        return 'primary';
      default:
        return 'secondary';
    }
  }

  protected canManageUser(user: ManagedUser): boolean {
    return user.status === 'ACTIVE';
  }

  protected officeLabel(user: Pick<ManagedUser, 'office'> | null | undefined): string {
    return user?.office?.name?.trim() || 'No office yet';
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const [users, usersWithoutOffice, offices] = await Promise.all([
        this.userService.getUsers(this.take, this.skip),
        this.userService.getUsersWithoutOffice(),
        this.officeService.getAccessibleOffices(),
      ]);

      this.users = users;
      this.usersWithoutOffice = usersWithoutOffice;
      this.offices = offices;
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      this.users = await this.userService.getUsers(this.take, this.skip);
    } catch (err: unknown) {
      this.errorMessage = this.extractErrorMessage(err);
      this.users = [];
    } finally {
      this.isLoading = false;
    }
  }

  private async reloadData(): Promise<void> {
    const [users, usersWithoutOffice] = await Promise.all([
      this.userService.getUsers(this.take, this.skip),
      this.userService.getUsersWithoutOffice(),
    ]);

    if (users.length === 0 && this.skip > 0) {
      this.skip = Math.max(0, this.skip - this.take);
      await this.reloadData();
      return;
    }

    this.users = users;
    this.usersWithoutOffice = usersWithoutOffice;

    if (this.lookupUser) {
      try {
        this.lookupUser = await this.userService.getUserById(this.lookupUser.id);
      } catch {
        this.lookupUser = null;
      }
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

    return 'The user management request failed.';
  }

  private avatarKey(user: Pick<ManagedUser, 'id' | 'avatar'>): string {
    return `${user.id}:${user.avatar ?? ''}`;
  }
}
