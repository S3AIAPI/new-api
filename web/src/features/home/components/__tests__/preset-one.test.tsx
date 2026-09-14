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
import { render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PresetOne } from '../preset-one'

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: {
    children?: ReactNode
    headerProps?: {
      floating?: boolean
      animateFloatingEntrance?: boolean
    }
  }) => (
    <div
      data-testid='public-layout'
      data-floating={String(props.headerProps?.floating)}
      data-animate-floating-entrance={String(
        props.headerProps?.animateFloatingEntrance
      )}
    >
      {props.children}
    </div>
  ),
}))

vi.mock('@/components/layout/components/footer', () => ({
  Footer: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: { children?: ReactNode }) => (
    <button type='button'>{props.children}</button>
  ),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: ReactNode }) => <a href='/'>{props.children}</a>,
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: {
      docs_link: 'https://docs.example.com',
      server_address: 'https://api.example.com',
    },
  }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'New API',
    appearance: { backgroundImage: '' },
    homepage: {
      presetTitleMode: 'i18n',
      presetSlaEnabled: false,
      presetSlaText: '',
    },
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { user: null } }),
}))

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag) => (props: Record<string, unknown>) => {
        const {
          variants: _variants,
          initial: _initial,
          animate: _animate,
          whileInView: _whileInView,
          viewport: _viewport,
          transition: _transition,
          ...domProps
        } = props
        return createElement(String(tag), domProps)
      },
    }
  ),
  useReducedMotion: () => false,
}))

describe('homepage preset one', () => {
  it('keeps the floating header entrance animation enabled', () => {
    render(<PresetOne />)

    const layout = screen.getByTestId('public-layout')
    expect(layout).toHaveAttribute('data-floating', 'true')
    expect(layout).toHaveAttribute('data-animate-floating-entrance', 'true')
  })
})
