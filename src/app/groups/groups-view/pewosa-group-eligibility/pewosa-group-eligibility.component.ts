/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService } from 'app/core/alert/alert.service';
import { ProductsService } from 'app/products/products.service';
import { PewosaGroupLendingService } from 'app/groups/pewosa-group-lending.service';
import {
  PewosaGroupEligibilityRequest,
  PewosaGroupEligibilityResponse,
  PewosaGroupEligibilityRule
} from 'app/groups/pewosa-group-lending.models';
import { DateFormatPipe } from 'app/pipes/date-format.pipe';

@Component({
  selector: 'mifosx-pewosa-group-eligibility',
  templateUrl: './pewosa-group-eligibility.component.html',
  styleUrls: ['./pewosa-group-eligibility.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatChipsModule,
    TranslateModule,
    DateFormatPipe
  ]
})
export class PewosaGroupEligibilityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private lendingService = inject(PewosaGroupLendingService);
  private productsService = inject(ProductsService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  groupId!: number;
  evalForm!: FormGroup;
  loanProducts: any[] = [];
  history: PewosaGroupEligibilityResponse[] = [];
  latestEvaluation: PewosaGroupEligibilityResponse | null = null;
  evaluating = false;
  loadingHistory = false;

  ruleColumns: string[] = ['code', 'description', 'policyThreshold', 'actualValue', 'status', 'message'];

  ngOnInit(): void {
    const idParam = this.route.parent?.snapshot.paramMap.get('groupId') || this.route.snapshot.paramMap.get('groupId');
    this.groupId = Number(idParam);
    this.initForm();
    if (this.groupId) {
      this.loadProducts();
      this.loadHistory();
    }
  }

  private initForm(): void {
    this.evalForm = this.fb.group({
      loanProductId: [null, [Validators.required]],
      requestedTotalAmount: [null, [Validators.required, Validators.min(1)]]
    });
  }

  private loadProducts(): void {
    this.productsService.getLoanProducts('loanproducts').subscribe({
      next: (products: any[]) => {
        this.loanProducts = products || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.loanProducts = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadHistory(): void {
    this.loadingHistory = true;
    this.cdr.markForCheck();

    this.lendingService.listEligibility(this.groupId).subscribe({
      next: (data: PewosaGroupEligibilityResponse[]) => {
        this.history = data || [];
        if (this.history.length > 0 && !this.latestEvaluation) {
          this.latestEvaluation = this.history[0];
        }
        this.loadingHistory = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingHistory = false;
        this.cdr.markForCheck();
      }
    });
  }

  evaluate(): void {
    if (this.evalForm.invalid) {
      return;
    }

    this.evaluating = true;
    this.cdr.markForCheck();

    const request: PewosaGroupEligibilityRequest = {
      loanProductId: Number(this.evalForm.value.loanProductId),
      requestedTotalAmount: Number(this.evalForm.value.requestedTotalAmount)
    };

    this.lendingService.createEligibility(this.groupId, request).subscribe({
      next: (res: PewosaGroupEligibilityResponse) => {
        this.latestEvaluation = res;
        this.history = [res, ...this.history];
        this.evaluating = false;
        const statusType = res.eligible ? 'SUCCESS' : 'WARN';
        this.alertService.alert({
          type: statusType,
          message: `Evaluation complete: Group is ${res.overallOutcome}.`
        });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.evaluating = false;
        const msg = err?.error?.defaultUserMessage || 'Eligibility evaluation failed.';
        this.alertService.alert({ type: 'ERROR', message: msg });
        this.cdr.markForCheck();
      }
    });
  }

  selectEvaluation(evalItem: PewosaGroupEligibilityResponse): void {
    this.latestEvaluation = evalItem;
    this.cdr.markForCheck();
  }
}
