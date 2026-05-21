import { Component } from '@angular/core';
import { BreadcrumbModule, CardModule, GridModule } from '@coreui/angular';

@Component({
  selector: 'app-dashboard',
  imports: [BreadcrumbModule, CardModule, GridModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {}
