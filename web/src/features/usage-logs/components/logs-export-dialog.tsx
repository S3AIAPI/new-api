import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { handleServerError } from '@/lib/handle-server-error'

export function LogsExportDialog(props: {
  open: boolean
  title?: string
  fileName: string
  request: () => Promise<Blob>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState<Error | null>(null)
  const translateRef = useRef(t)
  const requestRef = useRef(props.request)
  const fileNameRef = useRef(props.fileName)
  const onCloseRef = useRef(props.onClose)
  const pendingRequestRef = useRef<Promise<Blob> | null>(null)
  translateRef.current = t
  requestRef.current = props.request
  fileNameRef.current = props.fileName
  onCloseRef.current = props.onClose

  useEffect(() => {
    if (!props.open) {
      pendingRequestRef.current = null
      return
    }
    let active = true
    setError(null)
    if (!pendingRequestRef.current) {
      pendingRequestRef.current = Promise.resolve().then(() =>
        requestRef.current()
      )
    }
    void pendingRequestRef.current
      .then((blob) => {
        if (!active) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileNameRef.current
        document.body.append(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        onCloseRef.current()
      })
      .catch((requestError: unknown) => {
        if (!active) return
        const nextError =
          requestError instanceof Error
            ? requestError
            : new Error(translateRef.current('Failed to export logs'))
        setError(nextError)
        handleServerError(
          nextError,
          translateRef.current('Failed to export logs')
        )
      })
    return () => {
      active = false
    }
  }, [props.open])

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={props.title ?? t('Export CSV')}
      description={t('The server is preparing your CSV file.')}
      contentClassName='sm:max-w-md'
      showCloseButton={Boolean(error)}
      footer={
        error ? (
          <Button variant='outline' onClick={props.onClose}>
            {t('Close')}
          </Button>
        ) : undefined
      }
    >
      {error ? (
        <p className='text-destructive text-sm'>{t('Failed to export logs')}</p>
      ) : (
        <div className='space-y-3'>
          <p className='text-muted-foreground text-sm'>
            {t('Exporting all matching records...')}
          </p>
          <Progress value={null} aria-label={t('Export progress')} />
        </div>
      )}
    </Dialog>
  )
}
