import { getActiveAlerts } from '@/lib/alerts'
import { dismissAlertAction } from '@/actions/alerts'
import { AlertTriangle, X, ExternalLink } from 'lucide-react'

const SERVICE_LINKS: Record<string, { label: string; url: string }> = {
  anthropic: { label: 'Anthropic console', url: 'https://console.anthropic.com/settings/billing' },
  vercel:    { label: 'Vercel billing',    url: 'https://vercel.com/account/billing' },
  turso:     { label: 'Turso billing',     url: 'https://app.turso.tech/settings/billing' },
}

export async function AdminAlerts() {
  const alerts = await getActiveAlerts()
  if (alerts.length === 0) return null

  return (
    <div className="border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
      <div className="max-w-7xl mx-auto px-4 py-2 space-y-1">
        {alerts.map(alert => {
          const link = SERVICE_LINKS[alert.service]
          return (
            <div key={alert.id} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="font-medium capitalize">{alert.service}:</span> {alert.message}
                {link && (
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-0.5 underline underline-offset-2 hover:no-underline">
                    {link.label} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
              <form action={dismissAlertAction.bind(null, alert.id)}>
                <button type="submit" className="text-yellow-600 hover:text-yellow-900 dark:hover:text-yellow-100">
                  <X className="h-4 w-4" />
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
