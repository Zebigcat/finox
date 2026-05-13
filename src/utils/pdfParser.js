import * as pdfjsLib from 'pdfjs-dist'
import { categorize } from './csvParser'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

// Lines to skip — headers, footers, column titles
const SKIP_RE = [
  /^Lydia Solutions SAS/,
  /^Adresse médiateur/,
  /^c\/o WEBHELP/,
  /^Médiateur/,
  /^Page \d+\/\d+/,
  /^Extrait de compte en Euros/,
  /^Code client\s*:/,
  /^N° de compte\s*:/,
  /^Période\s*:/,
  /^Date\s+Libellé/,
  /^Mouvements en Euros/,
]

// Extract text lines from PDF, grouped by Y position
async function extractLines(pdf) {
  const lines = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    const byY = new Map()
    for (const item of content.items) {
      if (!item.str?.trim()) continue
      // Round to nearest 4pt to group items on the same visual line
      const y = Math.round(item.transform[5] / 4) * 4
      if (!byY.has(y)) byY.set(y, [])
      byY.get(y).push({ x: item.transform[4], str: item.str })
    }

    // Sort Y descending (PDF y=0 is bottom of page)
    for (const y of [...byY.keys()].sort((a, b) => b - a)) {
      const text = byY.get(y)
        .sort((a, b) => a.x - b.x)
        .map(i => i.str)
        .join(' ')
        .trim()
      if (text) lines.push(text)
    }
  }
  return lines
}

// Extract account name: line immediately before "Code client :"
function extractAccountName(lines) {
  const idx = lines.findIndex(l => /^Code client\s*:/.test(l))
  if (idx > 0) return lines[idx - 1].trim()
  return 'Inconnu'
}

const DATE_PREFIX_RE = /^(\d{2})\/(\d{2})\/(\d{4})\s/
// Two trailing decimal numbers (possibly negative, using period or comma)
const TRAILING_AMOUNTS_RE = /(-?\d[\d\s]*[.,]\d{2})\s+(-?\d[\d\s]*[.,]\d{2})\s*$/

function toFloat(s) {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.'))
}

function parseTxLine(text) {
  const dm = text.match(DATE_PREFIX_RE)
  if (!dm) return null

  const am = text.match(TRAILING_AMOUNTS_RE)
  if (!am) return null

  const date = `${dm[3]}-${dm[2]}-${dm[1]}`
  const amount = toFloat(am[1])

  // Libellé: between date (10 chars + space) and the trailing amounts
  const afterDate = text.slice(11)
  const amStart = afterDate.lastIndexOf(am[0].trimStart())
  const libelle = (amStart > 0 ? afterDate.slice(0, amStart) : afterDate).trim()

  if (!libelle || isNaN(amount)) return null
  return { date, libelle, amount }
}

// Clean PDF libellé into a readable merchant name
function cleanPDFLabel(libelle) {
  if (libelle.startsWith('Transaction carte : ')) return libelle.slice(20).trim()
  if (libelle.startsWith('Retrait carte : ')) return libelle.slice(16).trim()
  if (libelle.startsWith('Virement SEPA émis vers IBAN')) return 'Virement SEPA sortant'
  if (libelle.startsWith('Virement SEPA reçu')) return 'Virement SEPA reçu'
  if (libelle.startsWith('Annulation de la transaction carte du')) {
    const colonIdx = libelle.lastIndexOf(':')
    return colonIdx >= 0 ? `Annulation ${libelle.slice(colonIdx + 1).trim()}` : libelle
  }
  if (libelle.startsWith('Prélèvement SEPA : ')) return libelle.slice(19).trim()
  return libelle
}

function buildTransaction(tx, accountName, index) {
  const { category, emoji } = categorize(tx.libelle)
  const merchant = cleanPDFLabel(tx.libelle)
  // Stable ID: re-importing the same PDF gives the same IDs → no duplicates
  const id = `pdf-${accountName}-${tx.date}-${Math.abs(tx.amount).toFixed(2)}-${index}`
    .toLowerCase()
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')

  return {
    id,
    date: tx.date,
    label: tx.libelle,
    merchant,
    amount: tx.amount,
    category,
    emoji,
    balance: null,
  }
}

export async function parseSumeriaPDF(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const lines = await extractLines(pdf)

  const accountName = extractAccountName(lines)
  const transactions = []

  let inTx = false
  let soldeCount = 0  // track opening vs closing balance line
  let pending = []    // buffer for multi-line entries
  let txIndex = 0

  const flush = () => {
    if (!pending.length) return
    const combined = pending.join(' ')
    const tx = parseTxLine(combined)
    if (tx) transactions.push(buildTransaction(tx, accountName, txIndex++))
    pending = []
  }

  for (const line of lines) {
    if (SKIP_RE.some(re => re.test(line))) continue

    if (/^Solde du compte au/.test(line)) {
      soldeCount++
      if (soldeCount === 1) {
        // Opening balance line — start collecting after this
        inTx = true
      } else {
        // Closing balance line — end of transactions
        flush()
        inTx = false
      }
      continue
    }

    if (!inTx) continue

    if (DATE_PREFIX_RE.test(line)) {
      flush()
      pending = [line]
      // If line is already complete (has trailing amounts), flush immediately
      if (TRAILING_AMOUNTS_RE.test(line)) flush()
    } else if (pending.length) {
      pending.push(line)
      // Check if concatenated buffer is now complete
      if (TRAILING_AMOUNTS_RE.test(pending.join(' '))) flush()
    }
  }

  flush()
  return { accountName, transactions }
}
