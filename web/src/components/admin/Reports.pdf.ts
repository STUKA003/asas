import type { Barbershop } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import type { PlanReport } from '@/components/admin/PlanReportPanel'
import type { ReportData } from './Reports.types'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatMinutesToHours(value: number) {
  return `${(value / 60).toFixed(1)}h`
}

function getBaseStyles(accentColor: string, twoColTemplate: string) {
  return `
    * { box-sizing: border-box; }
    :root {
      --accent: ${accentColor};
      --text: #18181b;
      --muted: #71717a;
      --line: #e4e4e7;
      --panel: #ffffff;
      --soft: #f4f4f5;
    }
    body { font-family: Arial, sans-serif; color: var(--text); margin: 0; padding: 28px; background: #f5f5f5; }
    h1, h2, h3, p { margin: 0; }
    .page { background: white; border: 1px solid var(--line); border-radius: 24px; overflow: hidden; }
    .hero {
      padding: 28px 32px 22px;
      background: linear-gradient(135deg, #111827, #18181b 58%, #27272a);
      color: white;
    }
    .hero-top { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { display: flex; align-items: center; gap: 16px; }
    .logo-image, .logo-fallback {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      object-fit: cover;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.16);
    }
    .logo-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 700;
    }
    .report-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border-radius: 999px;
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.14);
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .hero h1 { font-size: 30px; margin-top: 16px; }
    .hero-subtitle { margin-top: 8px; color: rgba(255,255,255,.76); font-size: 14px; line-height: 1.55; max-width: 760px; }
    .hero-meta {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      color: rgba(255,255,255,.72);
      font-size: 12px;
    }
    .divider { opacity: .45; }
    .content { padding: 24px 32px 32px; }
    .section { margin-top: 28px; page-break-inside: avoid; }
    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }
    .section-title h2 { font-size: 18px; }
    .section-chip {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--accent);
      background: rgba(24, 24, 27, 0.06);
      padding: 7px 10px;
      border-radius: 999px;
    }
    .muted { color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0 28px; }
    .card { border: 1px solid var(--line); border-radius: 18px; padding: 16px; background: var(--panel); }
    .card-soft { background: var(--soft); }
    .eyebrow { font-size: 11px; text-transform: uppercase; color: var(--muted); letter-spacing: .08em; margin-bottom: 8px; }
    .value { font-size: 24px; font-weight: 700; }
    .summary { font-size: 14px; line-height: 1.7; padding: 18px 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; background: white; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
    th, td { border-bottom: 1px solid var(--line); padding: 11px 10px; text-align: left; font-size: 13px; }
    tr:last-child td { border-bottom: 0; }
    th { color: #52525b; font-size: 12px; text-transform: uppercase; background: #fafafa; }
    ul { margin: 10px 0 0; padding-left: 18px; }
    li { margin-bottom: 8px; font-size: 13px; }
    .two-col { display: grid; grid-template-columns: ${twoColTemplate}; gap: 16px; }
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--muted);
      font-size: 11px;
    }
    @media print {
      body { padding: 0; background: white; }
      .page { border: 0; border-radius: 0; }
      @page { size: A4; margin: 14mm; }
    }
  `
}

function getBranding(barbershop?: Barbershop) {
  const shopName = barbershop?.name || 'Barbershop'
  const accentColor = barbershop?.accentColor || '#18181b'
  const logoMarkup = barbershop?.logoUrl
    ? `<img src="${escapeHtml(barbershop.logoUrl)}" alt="${escapeHtml(shopName)}" class="logo-image" />`
    : `<div class="logo-fallback">${escapeHtml(shopName.charAt(0).toUpperCase())}</div>`
  const metaItems = [
    barbershop?.address ? `Address: ${barbershop.address}` : '',
    barbershop?.phone ? `Phone: ${barbershop.phone}` : '',
    barbershop?.instagram ? `Instagram: ${barbershop.instagram}` : '',
  ].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join('<span class="divider">•</span>')

  return { shopName, accentColor, logoMarkup, metaItems }
}

export function buildGeneralReportPdfHtml(data: ReportData, periodLabel: string, barbershop?: Barbershop) {
  const topServices = data.topServices.slice(0, 5).map((item) => `
    <tr><td>${escapeHtml(item.name)}</td><td>${item.count}</td><td>${formatCurrency(item.revenue)}</td></tr>
  `).join('')
  const topProducts = data.topProducts.slice(0, 5).map((item) => `
    <tr><td>${escapeHtml(item.name)}</td><td>${item.count}</td><td>${formatCurrency(item.revenue)}</td></tr>
  `).join('')
  const barbers = data.barbers.slice(0, 8).map((barber) => `
    <tr><td>${escapeHtml(barber.name)}</td><td>${barber.bookings}</td><td>${formatCurrency(barber.revenue)}</td><td>${formatPercent(barber.occupancyRate)}</td></tr>
  `).join('')
  const insights = data.insights.map((item) => `
    <li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)}</li>
  `).join('')
  const topCustomers = data.customers.topCustomers.slice(0, 5).map((item) => `
    <tr><td>${escapeHtml(item.name)}</td><td>${item.periodVisits ?? 0}</td></tr>
  `).join('')
  const { shopName, accentColor, logoMarkup, metaItems } = getBranding(barbershop)
  const generatedAt = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const executiveSummary = [
    `Total revenue for the period was ${formatCurrency(data.overview.totalRevenue)}, with an average ticket of ${formatCurrency(data.overview.avgTicket)}.`,
    `The schedule ran at ${formatPercent(data.occupancy.occupancyRate)} occupancy with ${formatMinutesToHours(data.occupancy.deadMinutes)} of dead time.`,
    `${data.customers.newCustomers} new customers and ${data.customers.recurringCustomers} returning customers were recorded.`,
  ].join(' ')

  return `
    <!doctype html>
    <html lang="pt-PT">
      <head>
        <meta charset="UTF-8" />
        <title>Report ${escapeHtml(periodLabel)}</title>
        <style>${getBaseStyles(accentColor, '1fr 1fr')}</style>
        <script>window.addEventListener('load', () => { setTimeout(() => { window.print() }, 350) })</script>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="hero-top">
              <div class="brand">
                ${logoMarkup}
                <div>
                  <div class="report-badge">Executive report</div>
                  <h1>${escapeHtml(shopName)} · General Report</h1>
                </div>
              </div>
              <div style="text-align:right">
                <p style="font-size:12px;color:rgba(255,255,255,.72)">Analyzed period</p>
                <p style="font-size:15px;font-weight:700;margin-top:6px">${escapeHtml(periodLabel)}</p>
              </div>
            </div>
            <p class="hero-subtitle">${escapeHtml(executiveSummary)}</p>
            <div class="hero-meta"><span>Generated on ${generatedAt}</span>${metaItems ? `<span class="divider">•</span>${metaItems}` : ''}</div>
          </div>
          <div class="content">
            <div class="grid">
              <div class="card"><div class="eyebrow">Total revenue</div><div class="value">${formatCurrency(data.overview.totalRevenue)}</div></div>
              <div class="card"><div class="eyebrow">Average ticket</div><div class="value">${formatCurrency(data.overview.avgTicket)}</div></div>
              <div class="card"><div class="eyebrow">Bookings</div><div class="value">${data.overview.totalBookings}</div></div>
              <div class="card"><div class="eyebrow">Schedule loss</div><div class="value">${formatPercent(data.cancellations.lossRate)}</div></div>
            </div>
            <div class="section">
              <div class="section-title"><h2>Executive summary</h2><span class="section-chip">Overview</span></div>
              <div class="card card-soft summary">${escapeHtml(executiveSummary)}</div>
            </div>
            <div class="section">
              <div class="section-title"><h2>Billing</h2><span class="section-chip">Financeiro</span></div>
              <div class="two-col">
                <div class="card"><div class="eyebrow">Daily</div><div class="value">${formatCurrency(data.billing.dailyRevenue)}</div></div>
                <div class="card"><div class="eyebrow">Weekly</div><div class="value">${formatCurrency(data.billing.weeklyRevenue)}</div></div>
                <div class="card"><div class="eyebrow">Monthly</div><div class="value">${formatCurrency(data.billing.monthlyRevenue)}</div></div>
                <div class="card"><div class="eyebrow">Plan revenue</div><div class="value">${formatCurrency(data.overview.planRevenue)}</div></div>
              </div>
            </div>
            <div class="section">
              <div class="section-title"><h2>Barber performance</h2><span class="section-chip">Team</span></div>
              <table><thead><tr><th>Barber</th><th>Cuts</th><th>Billing</th><th>Occupancy</th></tr></thead><tbody>${barbers || '<tr><td colspan="4">No data.</td></tr>'}</tbody></table>
            </div>
            <div class="section two-col">
              <div>
                <div class="section-title"><h2>Top services</h2><span class="section-chip">Services</span></div>
                <table><thead><tr><th>Service</th><th>Qtd.</th><th>Receita</th></tr></thead><tbody>${topServices || '<tr><td colspan="3">No data.</td></tr>'}</tbody></table>
              </div>
              <div>
                <div class="section-title"><h2>Top products</h2><span class="section-chip">Retail</span></div>
                <table><thead><tr><th>Product</th><th>Qtd.</th><th>Receita</th></tr></thead><tbody>${topProducts || '<tr><td colspan="3">No data.</td></tr>'}</tbody></table>
              </div>
            </div>
            <div class="section two-col">
              <div>
                <div class="section-title"><h2>Customers</h2><span class="section-chip">Loyalty</span></div>
                <p class="muted">New: ${data.customers.newCustomers} | Returning: ${data.customers.recurringCustomers} | Active: ${data.customers.activeCustomers}</p>
                <table><thead><tr><th>Customer</th><th>Visits</th></tr></thead><tbody>${topCustomers || '<tr><td colspan="2">No data.</td></tr>'}</tbody></table>
              </div>
              <div>
                <div class="section-title"><h2>Cancellations and no-shows</h2><span class="section-chip">Operational risk</span></div>
                <div class="card card-soft" style="display:grid;gap:10px">
                  <p class="muted">Cancellations: <strong style="color:var(--text)">${data.cancellations.cancelledBookings}</strong></p>
                  <p class="muted">No-shows: <strong style="color:var(--text)">${data.cancellations.noShowBookings}</strong></p>
                  <p class="muted">Cancellation rate: <strong style="color:var(--text)">${formatPercent(data.cancellations.cancellationRate)}</strong></p>
                  <p class="muted">No-show rate: <strong style="color:var(--text)">${formatPercent(data.cancellations.noShowRate)}</strong></p>
                  <p class="muted">Occupancy global: <strong style="color:var(--text)">${formatPercent(data.occupancy.occupancyRate)}</strong></p>
                </div>
              </div>
            </div>
            <div class="section">
              <div class="section-title"><h2>Automatic insights</h2><span class="section-chip">Suggested actions</span></div>
              <ul>${insights || '<li>No insights available.</li>'}</ul>
            </div>
            <div class="footer">
              <span>${escapeHtml(shopName)} • Internal report</span>
              <span>Document generated automatically by the barbershop dashboard</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function buildPlanReportPdfHtml(report: PlanReport, periodLabel: string, barbershop?: Barbershop) {
  const { shopName, accentColor, logoMarkup, metaItems } = getBranding(barbershop)
  const generatedAt = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const executiveSummary = [
    `The active base has ${report.overview.totalSubscribers} subscribers across ${report.overview.activePlans} active plan(s).`,
    `Estimated recurring revenue for the period is ${formatCurrency(report.overview.totalEstimatedRecurringRevenue)}.`,
    `${report.overview.totalBookingsUsed} uses were recorded, with an average of ${report.overview.averageUsagePerSubscriber.toFixed(1)} per subscriber.`,
  ].join(' ')
  const planRows = report.plans.map((plan) => `
    <tr><td>${escapeHtml(plan.name)}</td><td>${plan.subscribers}</td><td>${plan.bookingsUsed}</td><td>${formatCurrency(plan.estimatedRecurringRevenue)}</td><td>${plan.usagePerSubscriber.toFixed(1)}</td></tr>
  `).join('')
  const insights = report.insights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')

  return `
    <!doctype html>
    <html lang="pt-PT">
      <head>
        <meta charset="UTF-8" />
        <title>Plan report ${escapeHtml(periodLabel)}</title>
        <style>${getBaseStyles(accentColor, '1.35fr 1fr')}</style>
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 350))</script>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="hero-top">
              <div class="brand">
                ${logoMarkup}
                <div>
                  <div class="report-badge">Executive report</div>
                  <h1>${escapeHtml(shopName)} · Plan Report</h1>
                </div>
              </div>
              <div style="text-align:right">
                <p style="font-size:12px;color:rgba(255,255,255,.72)">Analyzed period</p>
                <p style="font-size:15px;font-weight:700;margin-top:6px">${escapeHtml(periodLabel)}</p>
              </div>
            </div>
            <p class="hero-subtitle">${escapeHtml(executiveSummary)}</p>
            <div class="hero-meta"><span>Generated on ${generatedAt}</span>${metaItems ? `<span class="divider">•</span>${metaItems}` : ''}</div>
          </div>
          <div class="content">
            <div class="grid">
              <div class="card"><div class="eyebrow">Subscribers</div><div class="value">${report.overview.totalSubscribers}</div></div>
              <div class="card"><div class="eyebrow">Recurring revenue</div><div class="value">${formatCurrency(report.overview.totalEstimatedRecurringRevenue)}</div></div>
              <div class="card"><div class="eyebrow">Uses</div><div class="value">${report.overview.totalBookingsUsed}</div></div>
              <div class="card"><div class="eyebrow">Unused</div><div class="value">${report.overview.inactiveSubscribers}</div></div>
            </div>
            <div class="section">
              <div class="section-title"><h2>Executive summary</h2><span class="section-chip">Overview</span></div>
              <div class="card card-soft summary">${escapeHtml(executiveSummary)}</div>
            </div>
            <div class="section two-col">
              <div>
                <div class="section-title"><h2>Performance by plan</h2><span class="section-chip">Plans</span></div>
                <table><thead><tr><th>Plan</th><th>Subscribers</th><th>Uses</th><th>Recurring</th><th>Average use</th></tr></thead><tbody>${planRows || '<tr><td colspan="5">No data.</td></tr>'}</tbody></table>
              </div>
              <div>
                <div class="section-title"><h2>Automatic insights</h2><span class="section-chip">Suggested actions</span></div>
                <ul>${insights || '<li>No insights available.</li>'}</ul>
              </div>
            </div>
            <div class="footer">
              <span>${escapeHtml(shopName)} • Internal report</span>
              <span>Document generated automatically by the barbershop dashboard</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
