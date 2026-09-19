/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { UptimePanel } from '../uptime-panel'

const getAnimationsDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  'getAnimations'
)

beforeEach(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (getAnimationsDescriptor) {
    Object.defineProperty(
      Element.prototype,
      'getAnimations',
      getAnimationsDescriptor
    )
  } else {
    Reflect.deleteProperty(Element.prototype, 'getAnimations')
  }
})

it('renders recent Uptime Kuma heartbeats as an accessible status strip', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: [
        {
          categoryName: 'Production',
          monitors: [
            {
              name: 'Gateway',
              group: 'Core',
              uptime: 0.975,
              status: 0,
              heartbeats: [
                { status: 1, time: '2026-09-13 10:00:00' },
                { status: 2, time: '2026-09-13 10:01:00' },
                { status: 0, time: '2026-09-13 10:02:00' },
              ],
            },
          ],
        },
      ],
    },
  })

  render(<UptimePanel />)

  expect(await screen.findByText('97.50%')).toBeVisible()
  const history = screen.getByRole('img', {
    name: 'Recent status for Gateway',
  })
  expect(
    within(history).getByLabelText('Operational: 2026-09-13 10:00:00')
  ).toBeVisible()
  expect(
    within(history).getByLabelText('Degraded: 2026-09-13 10:01:00')
  ).toBeVisible()
  expect(
    within(history).getByLabelText('Down: 2026-09-13 10:02:00')
  ).toBeVisible()
  expect(api.get).toHaveBeenCalledWith('/api/uptime/status')
})
