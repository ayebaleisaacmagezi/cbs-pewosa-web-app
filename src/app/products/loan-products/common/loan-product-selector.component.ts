/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, Input, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ProductsService } from '../../products.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-product-selector',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  template: `
    <mat-card class="m-b-16">
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'labels.inputs.Loan product' | translate }}</mat-label>
          <mat-select [value]="productId || 0" [disabled]="loading" (selectionChange)="selectProduct($event.value)">
            <mat-option [value]="0">{{ 'labels.buttons.Create Loan Product' | translate }}</mat-option>
            @for (product of products; track product.id) {
              <mat-option [value]="product.id">{{ product.name }} ({{ product.shortName || product.id }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (loading) {
          <p>{{ 'labels.text.Loading' | translate }}...</p>
        }
        @if (loadFailed) {
          <p>{{ 'labels.text.Loan policy configuration could not be loaded' | translate }}</p>
          <button mat-button type="button" (click)="loadProducts()">{{ 'labels.buttons.Refresh' | translate }}</button>
        }
      </mat-card-content>
    </mat-card>
  `
})
export class LoanProductSelectorComponent implements OnInit {
  @Input() productId: number | null = null;
  private productsService = inject(ProductsService);
  private router = inject(Router);
  private location = inject(Location);
  products: Array<{ id: number; name: string; shortName?: string }> = [];
  loading = false;
  loadFailed = false;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.loadFailed = false;
    this.productsService.getLoanProducts('loanproducts').subscribe({
      next: (products) => {
        this.products = products || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
      }
    });
  }

  selectProduct(id: number): void {
    if (Number(this.productId || 0) === Number(id)) return;
    const commands = id ? ['/products/loan-products', id, 'edit'] : ['/products/loan-products/create'];
    const url = this.router.createUrlTree(commands, { queryParams: { productType: 'loan' } });
    // A fresh editor prevents unsaved fields from the previous product carrying over.
    window.location.assign(this.location.prepareExternalUrl(this.router.serializeUrl(url)));
  }
}
