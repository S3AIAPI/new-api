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
import { describe, expect, it } from 'vitest'

import en from '../locales/en.json'
import fr from '../locales/fr.json'
import ja from '../locales/ja.json'
import ru from '../locales/ru.json'
import vi from '../locales/vi.json'
import zhTW from '../locales/zh-TW.json'
import zh from '../locales/zh.json'

const limitKeys = [
  "Today's check-in user limit has been reached.",
  "Today's remaining reward quota is below the maximum award.",
] as const

const locales = { en, zh, 'zh-TW': zhTW, fr, ja, ru, vi }

describe('check-in limit translations', () => {
  it.each(Object.entries(locales))(
    'includes both limit messages in %s',
    (_locale, resource) => {
      for (const key of limitKeys) {
        expect(resource.translation[key]).toBeTruthy()
      }
    }
  )
})
