'use client'

import { useMemo, useRef, useState } from 'react'
import type { Wine } from '@/db/schema'
import { buildWineListTree, buildWineListCsv } from '@/lib/wine-list'
import { Button } from '@/components/ui/button'
import { Download, Printer, ImageIcon, Loader2 } from 'lucide-react'

interface Props { wines: Wine[] }

function formatPrice(price: number | null): string {
  if (price == null) return ''
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`
}

export function WineListView({ wines }: Props) {
  const tree = useMemo(() => buildWineListTree(wines), [wines])
  const listRef = useRef<HTMLDivElement>(null)
  const [exportingImage, setExportingImage] = useState(false)

  const activeWines = wines.filter(w => w.quantity_remaining > 0)
  const bottleCount = activeWines.reduce((s, w) => s + w.quantity_remaining, 0)
  const today = new Date().toISOString().slice(0, 10)

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadCsv = () => {
    const csv = buildWineListCsv(wines)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `wine-list-${today}.csv`)
  }

  const downloadJpg = async () => {
    if (!listRef.current) return
    setExportingImage(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(listRef.current, { backgroundColor: '#ffffff', scale: 2 })
      canvas.toBlob(blob => {
        if (blob) downloadBlob(blob, `wine-list-${today}.jpg`)
      }, 'image/jpeg', 0.92)
    } finally {
      setExportingImage(false)
    }
  }

  const printPdf = () => window.print()

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Wine List</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeWines.length} wines · {bottleCount} bottles — export as CSV, PDF, or JPG
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadCsv}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={printPdf}>
            <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={downloadJpg} disabled={exportingImage}>
            {exportingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
            JPG
          </Button>
        </div>
      </div>

      <div ref={listRef} id="wine-list-printable" className="wine-list-paper">
        {tree.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No bottles in your cellar yet.</p>
        )}

        {tree.map(cat => (
          <section key={cat.category} className="wine-list-category">
            <h2 className="wine-list-category-title">{cat.category}</h2>
            {cat.colors.map(color => (
              <div key={color.color} className="wine-list-color">
                <h3 className="wine-list-color-title">{color.color}</h3>
                {color.countries.map(country => (
                  <div key={country.country} className="wine-list-country">
                    <h4 className="wine-list-country-title">{country.country}</h4>
                    {country.regions.map(region => (
                      <div key={region.region} className="wine-list-region">
                        {region.region !== 'Other' && (
                          <div className="wine-list-region-title">{region.region}</div>
                        )}
                        {region.entries.map(e => (
                          <div key={e.id} className="wine-list-entry">
                            <span className="wine-list-entry-name">
                              {e.nonVintage ? 'NV' : e.vintage ?? ''} {e.winery} {e.wineName}
                              {e.quantity > 1 && <span className="wine-list-entry-qty"> ×{e.quantity}</span>}
                            </span>
                            <span className="wine-list-entry-leader" />
                            <span className="wine-list-entry-price">{formatPrice(e.price)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
