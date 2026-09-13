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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SecureVerificationDialog } from '@/features/auth/secure-verification'
import { parseUserSettings } from '@/features/profile/lib/format'
import type { UserProfile } from '@/features/profile/types'

import { updateLoginTwoFactor } from '../api'
import { useAccountSecurity } from '../hooks/use-account-security'

type LoginTwoFactorToggleProps = {
  profile: UserProfile
  twoFAEnabled: boolean
  onUpdate: () => void
}

export function LoginTwoFactorToggle(props: LoginTwoFactorToggleProps) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(
    () =>
      parseUserSettings(props.profile.setting).login_two_factor_enabled !==
      false
  )
  const security = useAccountSecurity()

  useEffect(() => {
    setEnabled(
      parseUserSettings(props.profile.setting).login_two_factor_enabled !==
        false
    )
  }, [props.profile.setting])

  const handleChange = async (nextEnabled: boolean) => {
    if (nextEnabled === enabled || !props.twoFAEnabled) return
    const result = await security.run(async (signal) => {
      const proofToken = nextEnabled
        ? undefined
        : await security.verify(
            {
              scope: '2fa.login.disable',
              title: t('Disable login two-factor verification'),
              description: t(
                'Enter a current two-factor code to confirm this change.'
              ),
            },
            signal
          )
      return updateLoginTwoFactor(nextEnabled, proofToken, signal)
    })
    if (!result) return
    setEnabled(result.enabled)
    toast.success(t('Settings updated successfully'))
    props.onUpdate()
  }

  return (
    <>
      <div className='border-t pt-5'>
        <div className='flex items-center justify-between gap-4'>
          <div className='min-w-0 space-y-1'>
            <Label htmlFor='security-login-two-factor'>
              {t('Login Two-Factor Verification')}
            </Label>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              {props.twoFAEnabled
                ? t('Require a two-factor code when signing in')
                : t(
                    'Set up two-factor authentication before changing this setting.'
                  )}
            </p>
          </div>
          <Switch
            id='security-login-two-factor'
            checked={enabled}
            onCheckedChange={(checked) => void handleChange(checked)}
            disabled={!props.twoFAEnabled || security.pending}
          />
        </div>
      </div>
      <SecureVerificationDialog {...security.verificationDialogProps} />
    </>
  )
}
