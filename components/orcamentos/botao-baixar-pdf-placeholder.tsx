// Placeholder do botão "Baixar PDF" usado no preview do PR 1.
// É um Server Component estático: sem 'use client', sem handler, sem fetch.
// Existe apenas para validar o posicionamento visual no layout.
// Será substituído pelo componente real (client + fetch à API Puppeteer) no PR 2.

export function BotaoBaixarPdfPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Disponível no PR 2 — geração real de PDF"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-300 text-slate-600 text-sm font-semibold cursor-not-allowed opacity-70"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>Baixar PDF</span>
      <span className="text-[10px] font-normal">(disponível no PR 2)</span>
    </button>
  )
}
