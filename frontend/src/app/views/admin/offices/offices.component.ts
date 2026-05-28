import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AlertModule,
  BadgeModule,
  BreadcrumbModule,
  CardModule,
  GridModule,
  ModalModule,
} from '@coreui/angular';

import { OfficeService } from '../../../core/services/office.service';
import { UserService } from '../../../core/services/user.service';
import { getHttpErrorMessage } from '../../../shared/utils/http-error.utils';
import { OfficeRecord } from '../../../types/office.types';
import { ManagedUser } from '../../../types/user.types';

type OfficeHierarchyRow = {
  office: OfficeRecord;
  depth: number;
};

@Component({
  selector: 'app-offices',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AlertModule,
    BadgeModule,
    BreadcrumbModule,
    CardModule,
    GridModule,
    ModalModule,
  ],
  templateUrl: './offices.component.html',
  styleUrl: './offices.component.scss',
})
export class OfficesComponent implements OnInit {
  private readonly officeService = inject(OfficeService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  protected offices: OfficeRecord[] = [];
  protected users: ManagedUser[] = [];
  protected selectedOfficeId: string | null = null;

  protected isLoading = true;
  protected isSubmitting = false;
  protected formModalVisible = false;
  protected errorMessage: string | null = null;
  protected successMessage: string | null = null;

  protected readonly officeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    parentId: [''],
    userId: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  protected get selectedOffice(): OfficeRecord | null {
    return this.selectedOfficeId
      ? (this.offices.find((office) => office.id === this.selectedOfficeId) ?? null)
      : null;
  }

  protected get hierarchyRows(): OfficeHierarchyRow[] {
    const childrenByParent = new Map<string | null, OfficeRecord[]>();

    for (const office of this.offices) {
      const group = childrenByParent.get(office.parentId) ?? [];
      group.push(office);
      childrenByParent.set(office.parentId, group);
    }

    for (const group of childrenByParent.values()) {
      group.sort((left, right) => left.name.localeCompare(right.name));
    }

    const rows: OfficeHierarchyRow[] = [];
    const visit = (parentId: string | null, depth: number) => {
      for (const office of childrenByParent.get(parentId) ?? []) {
        rows.push({ office, depth });
        visit(office.id, depth + 1);
      }
    };

    visit(null, 0);
    return rows;
  }

  protected get availableParentOptions(): OfficeRecord[] {
    const selectedOffice = this.selectedOffice;
    if (!selectedOffice) {
      return this.offices;
    }

    const blockedIds = new Set([selectedOffice.id, ...this.getDescendantIds(selectedOffice.id)]);
    return this.offices.filter((office) => !blockedIds.has(office.id));
  }

  protected get activeUsers(): ManagedUser[] {
    return [...this.users]
      .filter((user) => user.status === 'ACTIVE')
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  protected dismissSuccess(): void {
    this.successMessage = null;
  }

  protected dismissError(): void {
    this.errorMessage = null;
  }

  protected beginCreate(): void {
    this.selectedOfficeId = null;
    this.officeForm.reset({
      name: '',
      parentId: '',
      userId: '',
    });
    this.formModalVisible = true;
  }

  protected beginEdit(office: OfficeRecord): void {
    this.selectedOfficeId = office.id;
    this.officeForm.reset({
      name: office.name,
      parentId: office.parentId ?? '',
      userId: office.head?.id ?? '',
    });
    this.formModalVisible = true;
  }

  protected cancelEdit(): void {
    this.formModalVisible = false;
    this.selectedOfficeId = null;
    this.officeForm.reset({ name: '', parentId: '', userId: '' });
  }

  protected parentLabel(office: OfficeRecord): string {
    if (!office.parentId) {
      return 'Top-level office';
    }

    return this.offices.find((candidate) => candidate.id === office.parentId)?.name ?? 'Unknown';
  }

  protected officeDepthLabel(depth: number): string {
    if (depth === 0) {
      return 'Root';
    }

    return `Level ${depth + 1}`;
  }

  protected async saveOffice(): Promise<void> {
    if (this.officeForm.invalid) {
      this.officeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const raw = this.officeForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      parentId: raw.parentId || undefined,
      userId: raw.userId || undefined,
    };

    try {
      if (this.selectedOfficeId) {
        await this.officeService.updateOffice({
          officeId: this.selectedOfficeId,
          ...payload,
        });
        this.successMessage = 'Office updated.';
      } else {
        await this.officeService.createOffice(payload);
        this.successMessage = 'Office created.';
      }

      await this.loadData();
      this.formModalVisible = false;
      this.selectedOfficeId = null;
      this.officeForm.reset({ name: '', parentId: '', userId: '' });
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The office could not be saved.');
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async deleteOffice(office: OfficeRecord): Promise<void> {
    const shouldDelete = window.confirm(
      `Archive "${office.name}"? This keeps history but removes it from active office lists.`,
    );

    if (!shouldDelete) {
      return;
    }

    this.errorMessage = null;

    try {
      await this.officeService.deleteOffice(office.id);
      this.successMessage = 'Office archived.';
      await this.loadData();

      if (this.selectedOfficeId === office.id) {
        this.beginCreate();
      }
    } catch (error: unknown) {
      this.errorMessage = getHttpErrorMessage(error, 'The office could not be archived.');
    }
  }

  protected userLabel(user: ManagedUser): string {
    return `${user.name} • ${user.email}`;
  }

  private async loadData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    const [officesResult, usersResult] = await Promise.allSettled([
      this.officeService.getOffices(500, 0),
      this.userService.getUsers(300, 0),
    ]);

    if (officesResult.status === 'fulfilled') {
      this.offices = officesResult.value.data;
    } else {
      this.errorMessage = getHttpErrorMessage(
        officesResult.reason,
        'The office directory could not be loaded.',
      );
    }

    if (usersResult.status === 'fulfilled') {
      this.users = usersResult.value;
    }

    this.isLoading = false;
  }

  private getDescendantIds(rootOfficeId: string): string[] {
    const result: string[] = [];
    const queue = [rootOfficeId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) {
        continue;
      }

      const children = this.offices.filter((office) => office.parentId === currentId);
      for (const child of children) {
        result.push(child.id);
        queue.push(child.id);
      }
    }

    return result;
  }
}
