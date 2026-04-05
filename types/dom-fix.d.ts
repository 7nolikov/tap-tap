// @types/node augments globalThis without DOM properties, causing the
// `Window & typeof globalThis` intersection to lose history, navigator, etc.
// This re-declares them on globalThis so the intersection resolves correctly.
declare global {
  // eslint-disable-next-line no-var
  var history: History
  var location: Location

  interface Navigator {
    readonly serviceWorker: ServiceWorkerContainer
    share(data?: ShareData): Promise<void>
    clipboard: Clipboard
  }

  interface KeyboardEvent {
    readonly metaKey: boolean
    readonly ctrlKey: boolean
    readonly key: string
  }
}
export {}
