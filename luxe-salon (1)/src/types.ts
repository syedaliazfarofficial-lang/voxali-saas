/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ScreenId = 'dashboard' | 'calendar' | 'pos' | 'clients' | 'inventory' | 'settings' | 'team';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: string;
}
