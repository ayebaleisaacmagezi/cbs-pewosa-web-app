/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ManagerWorkspaceView, WorkspaceNavigationService } from 'app/core/shell/workspace-navigation.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ExpenseWorkspaceComponent } from './expense-workspace.component';

@Component({
  selector: 'mifosx-manager-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    ExpenseWorkspaceComponent
  ],
  templateUrl: './manager-workspace.component.html',
  styleUrls: ['./manager-workspace.component.scss']
})
export class ManagerWorkspaceComponent implements OnInit {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly workspaceNavigation = inject(WorkspaceNavigationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  activeView: ManagerWorkspaceView = 'home';
  readonly credentials: any = this.authenticationService.getCredentials();

  ngOnInit(): void {
    const requestedView = this.route.snapshot.queryParamMap.get('view');
    if (this.isManagerView(requestedView)) this.workspaceNavigation.setManagerView(requestedView);
    this.workspaceNavigation.managerView$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((view) => {
      this.activeView = view;
    });
  }

  openView(view: ManagerWorkspaceView): void {
    this.workspaceNavigation.setManagerView(view);
  }

  private isManagerView(view: string | null): view is ManagerWorkspaceView {
    return (
      view === 'home' || view === 'approvals' || view === 'expenses' || view === 'operations' || view === 'reports'
    );
  }
}
