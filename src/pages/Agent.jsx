import { useState, useRef, useEffect } from 'react'
import { Send, Bot, AlertTriangle, Sparkles, Mic, MicOff, Camera, X } from 'lucide-react'
import Anthropic from '@anthropic-ai/sdk'
import { useFinance } from '../context/FinanceContext'
import { formatAmount, getCategoryEmoji } from '../utils/csvParser'
import { Link } from 'react-router-dom'

const SYSTEM_PROMPT = `Tu es Finox AI, un assistant financier personnel intelligent et bienveillant.
Tu analyses les finances de l'utilisateur et fournis des conseils personnalisés, clairs et actionnables.
Tu réponds TOUJOURS en français, de façon concise et structurée.
Tu utilises des emoji pour rendre tes réponses plus lisibles.
Tu ne révèles jamais les données brutes, mais tu les utilises pour formuler des observations pertinentes.`

const SUGGESTIONS = [
  'Où est-ce que je dépense trop ?',
  'Analyse mon mois de janvier',
  'Donne-moi 3 conseils pour économiser',
  'Quel est mon taux d\'épargne actuel ?',
  'Quelles dépenses semblent inhabituelles ?',
  'Compare mes deux derniers mois',
]

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function renderMarkdown(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}

export default function Agent() {
  const { apiKey, transactions, stats, addTransactions } = useFinance()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis **Finox AI**, votre assistant financier personnel.\n\nJe peux analyser vos transactions, identifier vos habitudes de dépense et vous donner des conseils personnalisés. Comment puis-je vous aider ?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const photoRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Financial context ────────────────────────────────────────────────────
  const buildContext = () => {
    if (!transactions.length) return 'Aucune transaction disponible.'

    const topCategories = Object.entries(stats.byCategory)
      .sort((a, b) => b[1].expenses - a[1].expenses)
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${formatAmount(v.expenses)}`)

    const topMerchants = Object.entries(stats.byMerchant)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${formatAmount(v)}`)

    const months = Object.keys(stats.byMonth).sort().slice(-3)
    const monthlyData = months.map(m => {
      const d = stats.byMonth[m]
      const [y, mo] = m.split('-')
      const label = new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      return `${label}: revenus ${formatAmount(d.income)}, dépenses ${formatAmount(d.expenses)}`
    })

    return `DONNÉES FINANCIÈRES :
- Transactions : ${stats.count}
- Revenus totaux : ${formatAmount(stats.totalIncome)}
- Dépenses totales : ${formatAmount(stats.totalExpenses)}
- Solde net : ${formatAmount(stats.balance)}
- Taux d'épargne : ${stats.totalIncome > 0 ? ((stats.balance / stats.totalIncome) * 100).toFixed(1) : 0}%

TOP CATÉGORIES :
${topCategories.join('\n')}

TOP MARCHANDS :
${topMerchants.join('\n')}

DERNIERS MOIS :
${monthlyData.join('\n')}

10 DERNIÈRES TRANSACTIONS :
${transactions.slice(0, 10).map(t => `- ${t.date} | ${t.merchant} | ${formatAmount(t.amount)} | ${t.category}`).join('\n')}`
  }

  // ── Send chat message ────────────────────────────────────────────────────
  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const contextMsg = {
        role: 'user',
        content: `[CONTEXTE FINANCIER]\n${buildContext()}\n\n[QUESTION]\n${text}`,
      }

      const historyMsgs = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [...historyMsgs, contextMsg],
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content[0]?.text || 'Désolé, je n\'ai pas pu générer une réponse.',
      }])
    } catch (e) {
      let errorMsg = 'Erreur lors de la communication avec l\'API.'
      if (e.status === 401) errorMsg = 'Clé API invalide. Vérifiez vos paramètres.'
      else if (e.status === 429) errorMsg = 'Limite de l\'API atteinte. Réessayez dans quelques instants.'
      else if (e.message) errorMsg = e.message
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${errorMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Voice input ──────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🎙️ La reconnaissance vocale n\'est pas supportée sur ce navigateur. Essayez Chrome ou Safari.',
      }])
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => (prev ? prev + ' ' : '') + transcript)
      inputRef.current?.focus()
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
    setListening(true)
  }

  // ── Receipt photo ────────────────────────────────────────────────────────
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be picked again
    e.target.value = ''

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '📸 Format non supporté. Utilisez une image JPG, PNG ou WebP.',
      }])
      return
    }

    setPhotoLoading(true)
    setMessages(prev => [...prev, {
      role: 'user',
      content: `📸 *Analyse de reçu en cours…*`,
    }])

    try {
      const base64 = await fileToBase64(file)
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: file.type, data: base64 },
            },
            {
              type: 'text',
              text: `Analyse ce reçu ou ticket de caisse. Réponds uniquement avec un objet JSON valide, rien d'autre :
{
  "merchant": "nom du marchand (string)",
  "amount": montant_total_négatif_en_euros (number, ex: -24.90),
  "date": "YYYY-MM-DD ou null",
  "category": "une de: Alimentation, Restaurant, Transport, Santé, Shopping, Loisirs, Voyage, Abonnements, Animaux, Autre"
}
Si une information est illisible, mets null pour ce champ. Le montant doit être négatif.`,
            },
          ],
        }],
      })

      const text = response.content[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*?\}/)

      if (!jsonMatch) throw new Error('Impossible d\'extraire les données du reçu.')

      const data = JSON.parse(jsonMatch[0])

      if (!data.merchant || data.amount === null || data.amount === undefined) {
        throw new Error('Données du reçu incomplètes (marchand ou montant manquant).')
      }

      const today = new Date().toISOString().slice(0, 10)
      const tx = {
        id: `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: data.date || today,
        label: data.merchant,
        merchant: data.merchant,
        amount: data.amount,
        category: data.category || 'Autre',
        emoji: getCategoryEmoji(data.category || 'Autre'),
        balance: null,
      }

      addTransactions([tx])

      const dateLabel = data.date
        ? new Date(data.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
        : 'aujourd\'hui'

      setMessages(prev => [
        ...prev.slice(0, -1), // remove the "en cours" placeholder
        {
          role: 'assistant',
          content: `✅ Reçu analysé et transaction ajoutée !\n\n**${data.merchant}** · ${formatAmount(data.amount)}\n📅 ${dateLabel} · ${tx.emoji} ${tx.category}`,
        },
      ])
    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: `❌ Impossible d'analyser ce reçu : ${e.message}`,
        },
      ])
    } finally {
      setPhotoLoading(false)
    }
  }

  // ── No API key state ─────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Agent IA</h1>
          <p className="page-subtitle">Assistant financier propulsé par Claude</p>
        </div>
        <div className="page-content">
          <div className="card" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, background: 'var(--accent-glow)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={24} color="var(--accent-light)" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Configuration requise</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Clé API Claude nécessaire</div>
              </div>
            </div>
            <div className="api-key-notice" style={{ marginBottom: 16 }}>
              <AlertTriangle />
              <p>Pour utiliser l'agent IA, configurez votre clé API Claude dans les paramètres.</p>
            </div>
            <Link to="/parametres" className="btn btn-primary">
              <Bot size={16} /> Configurer la clé API
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Main chat UI ─────────────────────────────────────────────────────────
  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Agent IA</h1>
            <p className="page-subtitle">
              {transactions.length
                ? `Analyse de ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}`
                : 'Aucune donnée importée — importez un CSV pour de meilleures analyses'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)' }}>
            <div style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%' }} />
            <span className="hide-mobile">Claude Haiku connecté</span>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="chat-container">

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  <div className="chat-avatar">
                    {msg.role === 'assistant' ? 'AI' : 'U'}
                  </div>
                  <div
                    className="chat-bubble"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </div>
              ))}

              {(loading || photoLoading) && (
                <div className="chat-message assistant">
                  <div className="chat-avatar">AI</div>
                  <div className="chat-bubble">
                    <div className="loading-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion chips — shown only on first message */}
            {messages.length === 1 && !loading && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    className="suggestion-chip"
                    onClick={() => sendMessage(s)}
                  >
                    <Sparkles size={11} />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="chat-input-area">
              {/* Voice button */}
              <button
                className={`chat-action-btn${listening ? ' listening' : ''}`}
                onClick={toggleVoice}
                title={listening ? 'Arrêter l\'écoute' : 'Saisie vocale (fr)'}
                type="button"
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              {/* Camera button */}
              <button
                className="chat-action-btn"
                onClick={() => photoRef.current?.click()}
                disabled={photoLoading}
                title="Scanner un reçu"
                type="button"
              >
                <Camera size={17} />
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhoto}
              />

              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder={listening ? '🎙️ Écoute en cours…' : 'Posez une question sur vos finances…'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />

              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                type="button"
              >
                <Send />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
