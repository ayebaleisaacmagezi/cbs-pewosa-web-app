/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { finalize, forkJoin } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { TellerCashMovement } from './teller-api.models';
import { TellerApiService } from './teller-api.service';

@Component({
  selector: 'mifosx-vault-officer-workspace',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  templateUrl: './vault-officer-workspace.component.html',
  styleUrls: [
    './staff-workspace.scss',
    './vault-officer-workspace.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VaultOfficerWorkspaceComponent implements OnInit {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly tellerApi = inject(TellerApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  credentials = this.authenticationService.getCredentials();
  movements: TellerCashMovement[] = [];
  selectedMovement: TellerCashMovement | null = null;
  noteControl = this.formBuilder.control('');
  loading = false;
  submitting = false;
  message = '';
  messageType: 'error' | 'success' | '' = '';

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.loading = true;
    forkJoin([
      this.tellerApi.getCashMovements('PENDING'),
      this.tellerApi.getCashMovements('FIRST_VERIFIED')
    ])
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: ([
          pending,
          firstVerified
        ]) => (this.movements = [
            ...pending,
            ...firstVerified
          ]),
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  selectMovement(movement: TellerCashMovement): void {
    if (this.submitting) return;
    this.selectedMovement = movement;
    this.noteControl.setValue('');
  }

  verifyMovement(): void {
    if (!this.selectedMovement || this.submitting) return;
    this.submitting = true;
    this.tellerApi
      .updateCashMovement(this.selectedMovement.reference, 'VERIFY', this.noteControl.value?.trim() || undefined)
      .pipe(
        finalize(() => {
          this.submitting = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (movement) => {
          this.selectedMovement = null;
          this.showMessage(
            movement.status === 'COMPLETED'
              ? 'The second independent verification completed the vault movement.'
              : 'Your independent verification was recorded. A different vault officer must verify next.',
            'success'
          );
          this.loadMovements();
        },
        error: (error: unknown) => this.showMessage(this.tellerApi.mapError(error).message, 'error')
      });
  }

  private showMessage(message: string, type: 'error' | 'success'): void {
    this.message = message;
    this.messageType = type;
  }
}
