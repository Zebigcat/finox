import Papa from 'papaparse'

// Category rules based on keywords — order matters (first match wins)
const CATEGORY_RULES = [
  { keywords: ['salaire', 'virement entrant', 'remuneration', 'paye', 'acompte', 'revenu', 'indemnite', 'allocation', 'pension', 'rente'], category: 'Revenus', emoji: '💰' },
  { keywords: ['carrefour', 'leclerc', 'lidl', 'aldi', 'monoprix', 'casino', 'intermarche', 'franprix', 'supermarche', 'epicerie', 'biocoop', 'naturalia', 'marche', 'primeur', 'boucherie', 'poissonnerie'], category: 'Alimentation', emoji: '🛒' },
  { keywords: ['restaurant', 'resto', 'brasserie', 'bistro', 'mcdo', 'mcdonald', 'kfc', 'burger king', 'burger', 'pizza', 'sushi', 'kebab', 'boulangerie', 'patisserie', 'snack', 'sandwicherie', 'traiteur', 'deliveroo', 'ubereats', 'just eat'], category: 'Restaurant', emoji: '🍽️' },
  { keywords: ['sncf', 'ratp', 'transdev', 'navigo', 'metro', 'tgv', 'ter', 'ouigo', 'bus', 'taxi', 'uber', 'blablacar', 'velib', 'lime', 'bird', 'parking', 'autoroute', 'peage', 'essence', 'total', 'bp ', 'shell', 'esso', 'station'], category: 'Transport', emoji: '🚆' },
  { keywords: ['netflix', 'spotify', 'amazon prime', 'disney', 'canal+', 'deezer', 'apple music', 'youtube premium', 'twitch', 'hulu', 'abonnement', 'subscription', 'adobe', 'microsoft 365', 'icloud', 'dropbox'], category: 'Abonnements', emoji: '📱' },
  { keywords: ['edf', 'engie', 'total energie', 'electricite', 'gaz', 'eau', 'veolia', 'suez', 'loyer', 'charges', 'syndic', 'chauffage', 'fibre', 'orange', 'sfr', 'bouygues', 'free', 'iliad', 'numericable', 'internet', 'telephone'], category: 'Logement', emoji: '🏠' },
  { keywords: ['pharmacie', 'medecin', 'docteur', 'hopital', 'clinique', 'sante', 'mutuelle', 'optique', 'dentiste', 'opticien', 'kiné', 'kinesitherapeute', 'infirmier', 'labo', 'analyse'], category: 'Santé', emoji: '🏥' },
  { keywords: ['assurance', 'maif', 'macif', 'axa', 'allianz', 'groupama', 'matmut', 'covea', 'generali', 'harmonie'], category: 'Assurances', emoji: '🛡️' },
  { keywords: ['fnac', 'darty', 'boulanger', 'amazon', 'apple store', 'cdiscount', 'ldlc', 'materiel.net', 'zara', 'h&m', 'uniqlo', 'asos', 'shein', 'vetement', 'chaussure', 'kiabi', 'jules', 'celio', 'decathlon', 'leroy merlin', 'ikea', 'maisons du monde'], category: 'Shopping', emoji: '🛍️' },
  { keywords: ['gym', 'sport', 'fitness', 'salle de sport', 'piscine', 'tennis', 'foot', 'cinema', 'cine', 'theatre', 'concert', 'spectacle', 'loisir', 'jeux', 'playstation', 'xbox', 'steam', 'nintendo', 'parc', 'musee'], category: 'Loisirs', emoji: '🎭' },
  { keywords: ['veterinaire', 'veto', 'clinique veterinaire', 'royal canin', 'croquette', 'animalerie', 'animaux', 'wanimo', 'zooplus', 'truffaut animaux'], category: 'Animaux', emoji: '🐾' },
  { keywords: ['airbnb', 'hotel', 'booking', 'voyage', 'vacances', 'avion', 'ryanair', 'easyjet', 'air france', 'corsair', 'transavia', 'volotea', 'expedia', 'opodo', 'lastminute'], category: 'Voyage', emoji: '✈️' },
  { keywords: ['frais bancaires', 'cotisation carte', 'agios', 'commission', 'decouvert', 'interets debiteurs', 'frais de tenue', 'frais virement', 'incident de paiement', 'frais de rejet'], category: 'Frais bancaires', emoji: '🏦' },
  { keywords: ['retrait', 'dab', 'atm', 'especes'], category: 'Retrait', emoji: '💵' },
  { keywords: ['credit', 'remboursement credit', 'mensualite'], category: 'Crédit', emoji: '💳' },
]

export function getCategoryEmoji(category) {
  const rule = CATEGORY_RULES.find(r => r.category === category)
  return rule?.emoji || '📦'
}

export const CATEGORIES = CATEGORY_RULES.map(r => ({ name: r.category, emoji: r.emoji }))

function categorize(label) {
  const lower = label.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, emoji: rule.emoji }
    }
  }
  return { category: 'Autre', emoji: '📦' }
}

function cleanMerchant(label) {
  // Remove common prefixes/noise
  return label
    .replace(/^(carte|virement|prelevement|paiement|cb |vir |prl |chq |ret |remboursement)\s*/i, '')
    .replace(/\s+\d{2}\/\d{2}\/\d{4}.*$/, '')
    .replace(/\s+\d{4,}.*$/, '')
    .trim()
    .split(' ').slice(0, 4).join(' ')
}

function parseDate(str) {
  if (!str) return null
  // DD/MM/YYYY
  const m1 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
  // YYYY-MM-DD
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return str.slice(0, 10)
  // DD-MM-YYYY
  const m3 = str.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (m3) return `${m3[3]}-${m3[2]}-${m3[1]}`
  return str
}

function parseAmount(str) {
  if (!str) return null
  // Replace French decimal comma, remove spaces, strip currency
  const cleaned = String(str)
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[€$£]/g, '')
    .replace(/\+/, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

// Generate stable id from transaction data
function makeId(date, label, amount, index) {
  return `${date}-${label.slice(0, 20)}-${amount}-${index}`.replace(/\s+/g, '_')
}

// Try to detect Sumeria/Orange Bank CSV format
function detectFormat(headers) {
  const h = headers.map(h => h.toLowerCase().trim())
  // Sumeria format: date, libelle, montant, solde (various spellings)
  const hasMontant = h.some(x => x.includes('montant') || x.includes('amount'))
  const hasDate = h.some(x => x.includes('date'))
  const hasLabel = h.some(x => x.includes('libel') || x.includes('label') || x.includes('libell'))
  const hasDebitCredit = h.some(x => x.includes('débit') || x.includes('debit') || x.includes('crédit') || x.includes('credit'))
  return { hasMontant, hasDate, hasLabel, hasDebitCredit }
}

// Sumeria bank exports have 9 metadata lines before the actual header row
const SUMERIA_METADATA_LINES = 9

export function parseSumeriaCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      beforeFirstChunk: (chunk) => {
        const lines = chunk.split('\n')
        // If first line looks like metadata (doesn't start with "Date"), skip 9 lines
        if (lines.length > SUMERIA_METADATA_LINES && !lines[0].toLowerCase().startsWith('date')) {
          return lines.slice(SUMERIA_METADATA_LINES).join('\n')
        }
        return chunk
      },
      complete: (results) => {
        try {
          if (!results.data.length) {
            reject(new Error('Le fichier CSV est vide.'))
            return
          }

          const headers = Object.keys(results.data[0])
          const { hasMontant, hasDate, hasLabel, hasDebitCredit } = detectFormat(headers)

          if (!hasDate || (!hasMontant && !hasLabel && !hasDebitCredit)) {
            reject(new Error('Format CSV non reconnu. Assurez-vous d\'utiliser un export Sumeria.'))
            return
          }

          // Map header names (case-insensitive)
          const find = (keys) => headers.find(h => keys.some(k => h.toLowerCase().includes(k)))

          const dateKey = find(['date'])
          const labelKey = find(['libellé', 'libel', 'label', 'libell', 'description', 'operat'])
          const amountKey = find(['montant', 'amount', 'credit/debit'])
          const debitKey = find(['débit', 'debit', 'sortie'])
          const creditKey = find(['crédit', 'credit', 'entree', 'entrée'])
          const balanceKey = find(['solde', 'balance'])

          const transactions = []

          results.data.forEach((row, i) => {
            const rawDate = row[dateKey] || ''
            const rawLabel = row[labelKey] || ''
            const date = parseDate(rawDate.trim())
            if (!date) return

            let amount = null
            if (amountKey) {
              amount = parseAmount(row[amountKey])
            } else if (debitKey || creditKey) {
              const debit = debitKey ? parseAmount(row[debitKey]) : null
              const credit = creditKey ? parseAmount(row[creditKey]) : null
              // Sumeria: debit values are already negative (e.g. "-30.48 €"), credit are positive
              if (debit !== null) amount = debit
              else if (credit !== null) amount = credit
            }

            if (amount === null) return

            const label = rawLabel.trim()
            const { category, emoji } = categorize(label)
            const merchant = cleanMerchant(label)

            transactions.push({
              id: makeId(date, label, amount, i),
              date,
              label,
              merchant,
              amount,
              category,
              emoji,
              balance: balanceKey ? parseAmount(row[balanceKey]) : null,
            })
          })

          if (!transactions.length) {
            reject(new Error('Aucune transaction valide trouvée dans ce fichier.'))
            return
          }

          resolve(transactions)
        } catch (e) {
          reject(new Error('Erreur lors du parsing: ' + e.message))
        }
      },
      error: (err) => reject(new Error('Erreur de lecture: ' + err.message)),
    })
  })
}

export const CATEGORY_COLORS = {
  'Revenus': '#4ade80',
  'Alimentation': '#86efac',
  'Restaurant': '#fb923c',
  'Transport': '#60a5fa',
  'Abonnements': '#a78bfa',
  'Logement': '#f472b6',
  'Santé': '#34d399',
  'Assurances': '#94a3b8',
  'Shopping': '#fbbf24',
  'Loisirs': '#f87171',
  'Animaux': '#fb7185',
  'Voyage': '#38bdf8',
  'Frais bancaires': '#e879f9',
  'Retrait': '#d4d4d8',
  'Crédit': '#818cf8',
  'Autre': '#71717a',
}

export function formatAmount(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
