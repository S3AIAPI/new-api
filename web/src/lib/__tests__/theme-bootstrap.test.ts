/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

const indexHtmlPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../index.html'
)
const indexHtml = readFileSync(indexHtmlPath, 'utf8')
const themeBootstrapSource = (() => {
  const source = indexHtml.match(
    /<script data-theme-bootstrap>([\s\S]*?)<\/script>/
  )?.[1]
  if (!source) {
    throw new Error('Theme bootstrap script is missing from index.html')
  }
  return source
})()

function createPage(options: {
  cookie?: string
  systemDark: boolean
  cachedAppearance?: Record<string, string>
}) {
  document.documentElement.className = ''
  document.documentElement.style.cssText = ''
  document.head.innerHTML = '<meta name="theme-color" content="#fff" />'
  document.body.innerHTML = ''
  document.cookie = 'vite-ui-theme=; Max-Age=0; path=/'

  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: options.systemDark,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }))

  if (options.cookie) {
    document.cookie = `${options.cookie}; path=/`
  }
  if (options.cachedAppearance) {
    localStorage.setItem(
      'status',
      JSON.stringify({ site_appearance: options.cachedAppearance })
    )
  }

  new Function(themeBootstrapSource)()
  return {
    root: document.documentElement,
    metaThemeColor: document.querySelector('meta[name="theme-color"]'),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.cookie = 'vite-ui-theme=; Max-Age=0; path=/'
})

describe('initial theme bootstrap', () => {
  it.each([
    {
      name: 'stored dark preference',
      cookie: 'vite-ui-theme=dark',
      systemDark: false,
      expectedTheme: 'dark',
    },
    {
      name: 'dark system preference',
      systemDark: true,
      expectedTheme: 'dark',
    },
    {
      name: 'stored light preference over dark system',
      cookie: 'vite-ui-theme=light',
      systemDark: true,
      expectedTheme: 'light',
    },
    {
      name: 'cached forced dark theme',
      systemDark: false,
      cachedAppearance: { default_theme_override: 'dark' },
      expectedTheme: 'dark',
    },
  ])('applies $name before React mounts', (options) => {
    const { root, metaThemeColor } = createPage(options)

    expect(root.classList.contains(options.expectedTheme)).toBe(true)
    expect(root.style.colorScheme).toBe(options.expectedTheme)
    expect(metaThemeColor).toHaveAttribute(
      'content',
      options.expectedTheme === 'dark' ? '#202020' : '#fff'
    )
  })
})
