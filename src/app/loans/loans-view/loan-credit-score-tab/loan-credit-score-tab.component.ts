/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanCreditScore } from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';

@Component({
  selector: 'mifosx-loan-credit-score-tab',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './loan-credit-score-tab.component.html',
  styleUrls: ['./loan-credit-score-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanCreditScoreTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly loanApplicationService = inject(PewosaLoanApplicationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly loanId = Number(this.route.parent?.snapshot.params['loanId']);
  creditScore: LoanCreditScore | null = null;
  loading = false;
  calculating = false;
  error = '';

  ngOnInit(): void {
    this.load();
  }

  calculate(): void {
    if (this.calculating) {
      return;
    }
    this.error = '';
    this.calculating = true;
    this.loanApplicationService
      .calculateCreditScore(this.loanId)
      .pipe(finalize(() => (this.calculating = false)))
      .subscribe({
        next: (creditScore) => this.updateScore(creditScore),
        error: () => {
          this.error = 'The score could not be calculated. Complete the appraisal and required inputs first.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private load(): void {
    this.loading = true;
    this.loanApplicationService
      .getCreditScore(this.loanId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (creditScore) => this.updateScore(creditScore),
        error: () => {
          this.creditScore = null;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private updateScore(creditScore: LoanCreditScore): void {
    this.creditScore = creditScore;
    this.changeDetectorRef.markForCheck();
  }
}
