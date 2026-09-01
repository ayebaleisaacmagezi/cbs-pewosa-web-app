/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { normalizedWorkspaceRoles } from './staff-workspace.guard';

describe('normalizedWorkspaceRoles', () => {
  it('normalizes string roles', () => {
    expect(
      normalizedWorkspaceRoles([
        ' Cashier ',
        'Loan Officer'
      ])
    ).toEqual([
      'cashier',
      'loan officer'
    ]);
  });

  it('normalizes role objects returned by Fineract', () => {
    expect(
      normalizedWorkspaceRoles([
        { name: 'Chief Teller' },
        { displayName: 'Loan Officer' },
        { roleName: 'Cashier' }
      ])
    ).toEqual([
      'chief teller',
      'loan officer',
      'cashier'
    ]);
  });

  it('returns an empty list when roles are missing', () => {
    expect(normalizedWorkspaceRoles(null)).toEqual([]);
  });
});
