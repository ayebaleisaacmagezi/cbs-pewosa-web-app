/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { catchError, distinctUntilChanged, map, of, switchMap, tap, timer } from 'rxjs';

import { ClientsService } from 'app/clients/clients.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

type MemberSearchState = 'idle' | 'loading' | 'results' | 'empty' | 'error';

interface MemberSearchOutcome {
  state: Exclude<MemberSearchState, 'idle' | 'loading'>;
  members: any[];
}

@Component({
  selector: 'mifosx-member-search',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon
  ],
  templateUrl: './member-search.component.html',
  styleUrls: ['./member-search.component.scss']
})
export class MemberSearchComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) officeId!: number;
  @Output() memberSelected = new EventEmitter<any>();
  @Output() queryChanged = new EventEmitter<void>();

  searchControl = this.formBuilder.control('', [
    Validators.required,
    Validators.minLength(2)
  ]);
  searchState: MemberSearchState = 'idle';
  members: any[] = [];

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        map((value) => (typeof value === 'string' ? value.trim() : '')),
        distinctUntilChanged(),
        tap((query) => {
          this.queryChanged.emit();
          this.members = [];
          this.searchState = query.length >= 2 ? 'loading' : 'idle';
        }),
        switchMap((query) => {
          if (query.length < 2) return of(null);

          return timer(200).pipe(
            switchMap(() =>
              this.clientsService.searchClientsInOffice(query, this.officeId).pipe(
                map(
                  (members): MemberSearchOutcome => ({
                    state: members.length ? 'results' : 'empty',
                    members
                  })
                ),
                catchError(() =>
                  of<MemberSearchOutcome>({
                    state: 'error',
                    members: []
                  })
                )
              )
            )
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((outcome) => {
        if (!outcome) return;
        this.members = outcome.members;
        this.searchState = outcome.state;
      });
  }

  selectMember(member: any): void {
    this.searchControl.setValue(member.displayName, { emitEvent: false });
    this.members = [];
    this.searchState = 'idle';
    this.memberSelected.emit(member);
  }
}
