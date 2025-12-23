import '../.astro/types.d.ts'
/// <reference types="astro/client" />

interface Env {
  SITE_PASSWORD: string
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>

declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Locals extends Runtime {}
}
