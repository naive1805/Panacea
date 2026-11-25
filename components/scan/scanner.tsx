'use client'

import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser'
import { AlertCircle, Camera, CameraOff, Check, Keyboard, ScanBarcode } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'

import { saveScannedBarcode } from '@/lib/actions/barcodes'

type ScannerState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'scanning' }
  | { phase: 'saving'; code: string }
  | { phase: 'saved'; code: string; duplicate: boolean }
  | { phase: 'error'; message: string }

export function Scanner() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const processingRef = useRef(false)
  const [state, setState] = useState<ScannerState>({ phase: 'idle' })
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const saveCode = useCallback(
    async (rawCode: string, format?: string) => {
      const code = rawCode.trim()
      if (!code || processingRef.current) return
      processingRef.current = true
      stopCamera()
      setState({ phase: 'saving', code })

      try {
        const result = await saveScannedBarcode(code, format)
        if (!result.ok) {
          setState({ phase: 'error', message: result.error })
          return
        }
        setState({ phase: 'saved', code, duplicate: result.duplicate })
        setManual('')
        router.refresh()
      } catch {
        setState({
          phase: 'error',
          message: 'The barcode could not be saved. Please try again.',
        })
      } finally {
        processingRef.current = false
      }
    },
    [router, stopCamera],
  )

  async function startCamera() {
    setManualError(null)
    setState({ phase: 'starting' })

    if (!navigator.mediaDevices?.getUserMedia) {
      setState({
        phase: 'error',
        message: 'This browser cannot open the camera. Enter the barcode below.',
      })
      return
    }

    const video = videoRef.current
    if (!video) {
      setState({ phase: 'error', message: 'The camera preview could not start.' })
      return
    }

    try {
      const reader = new BrowserMultiFormatReader()
      controlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        video,
        (result) => {
          if (result && !processingRef.current) {
            const format = result.getBarcodeFormat().toString()
            void saveCode(result.getText(), format)
          }
        },
      )
      setState({ phase: 'scanning' })
    } catch {
      stopCamera()
      setState({
        phase: 'error',
        message:
          'The camera could not be opened. Check camera permission and try again, or enter the number below.',
      })
    }
  }

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clean = manual.trim()
    if (!clean) {
      setManualError('Enter the number printed under the barcode.')
      return
    }
    setManualError(null)
    void saveCode(clean, 'MANUAL')
  }

  const scanning = state.phase === 'scanning'
  const cameraUnavailable = state.phase === 'idle' || state.phase === 'starting' || state.phase === 'error' || state.phase === 'saved'

  return (
    <div className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-lg border border-border/80 bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-normal tracking-tight">Scan a medicine pack</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Read and save its barcode, then match it to a medicine below.
            </p>
          </div>
          {scanning ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                Scanning
              </span>
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setState({ phase: 'idle' })
                }}
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Stop
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative aspect-[4/3] w-full bg-foreground/90">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${scanning ? 'opacity-100' : 'opacity-0'}`}
          />

          {scanning ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-40 w-2/3 max-w-sm rounded-lg border-2 border-white/80">
                <span className="absolute -top-px -left-px h-6 w-6 border-t-2 border-l-2 border-primary" />
                <span className="absolute -top-px -right-px h-6 w-6 border-t-2 border-r-2 border-primary" />
                <span className="absolute -bottom-px -left-px h-6 w-6 border-b-2 border-l-2 border-primary" />
                <span className="absolute -right-px -bottom-px h-6 w-6 border-r-2 border-b-2 border-primary" />
              </div>
            </div>
          ) : null}

          {cameraUnavailable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white">
                {state.phase === 'error' ? <CameraOff className="size-6" /> : <Camera className="size-6" />}
              </span>
              <div className="max-w-md text-sm leading-6 text-white/85">
                {state.phase === 'error' ? (
                  <p role="alert">{state.message}</p>
                ) : state.phase === 'saved' ? (
                  <p role="status" className="inline-flex items-center gap-2">
                    <Check className="size-4 text-success" />
                    {state.duplicate ? 'This barcode is already in your register.' : 'Barcode saved to your register.'}
                    <span className="font-medium text-white">{state.code}</span>
                  </p>
                ) : state.phase === 'starting' ? (
                  'Opening the camera…'
                ) : (
                  'Camera is off. Start scanning or enter the number printed below the bars.'
                )}
              </div>
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={state.phase === 'starting'}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <ScanBarcode className="size-4" />
                {state.phase === 'starting' ? 'Starting…' : state.phase === 'error' ? 'Try camera again' : 'Start camera'}
              </button>
            </div>
          ) : null}

          {state.phase === 'saving' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/80 px-6 text-center">
              <p className="font-serif text-2xl text-background">{state.code}</p>
              <p className="text-sm text-background/70">Saving barcode…</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border/80 bg-card">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="font-serif text-xl font-normal tracking-tight">Enter a barcode</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Useful when camera access is unavailable or the pack is hard to scan.
          </p>
        </div>
        <form onSubmit={submitManual} className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="flex min-w-56 flex-1 flex-col gap-1.5">
            <label htmlFor="manual-barcode" className="text-sm font-medium">Barcode number</label>
            <input
              id="manual-barcode"
              autoComplete="off"
              value={manual}
              onChange={(event) => {
                setManual(event.target.value)
                setManualError(null)
              }}
              placeholder="e.g. 8901234567890"
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-subtle outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
            />
            {manualError ? <p role="alert" className="text-xs font-medium text-destructive">{manualError}</p> : null}
          </div>
          <button
            type="submit"
            disabled={state.phase === 'saving'}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Keyboard className="size-4" />
            Save number
          </button>
        </form>
        <div className="border-t border-dashed px-5 py-4">
          <p className="inline-flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Scanning only reads and saves the printed code. You choose the matching medicine from your library.
          </p>
        </div>
      </section>
    </div>
  )
}
