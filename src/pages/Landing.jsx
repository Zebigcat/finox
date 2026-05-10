import { Link } from 'react-router-dom'
import { Bot, TrendingUp, Upload, Shield, Mic, Camera, Sparkles, ArrowRight, BarChart2, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: Bot,
    title: 'Agent IA en français',
    desc: 'Posez des questions sur vos finances en langage naturel. Analyses personnalisées, conseils actionnables.',
    color: 'var(--accent)',
    glow: 'var(--accent-glow)',
  },
  {
    icon: Upload,
    title: 'Import CSV multi-fichiers',
    desc: 'Compatible Sumeria / Orange Bank. Glissez plusieurs fichiers, les doublons sont supprimés automatiquement.',
    color: 'var(--blue)',
    glow: 'rgba(96,165,250,0.12)',
  },
  {
    icon: BarChart2,
    title: 'Analyses visuelles',
    desc: 'Graphiques par catégorie, évolution mensuelle, top marchands. Comprenez vos finances d\'un coup d\'œil.',
    color: 'var(--green)',
    glow: 'rgba(74,222,128,0.1)',
  },
  {
    icon: Mic,
    title: 'Saisie vocale',
    desc: 'Parlez directement à votre assistant. La reconnaissance vocale transcrit votre question en temps réel.',
    color: 'var(--yellow)',
    glow: 'rgba(251,191,36,0.1)',
  },
  {
    icon: Camera,
    title: 'Scan de reçus',
    desc: 'Photographiez un ticket de caisse. L\'IA extrait le marchand, le montant et la date automatiquement.',
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.1)',
  },
  {
    icon: Shield,
    title: '100 % local & privé',
    desc: 'Vos données restent dans votre navigateur. Aucun serveur, aucune inscription, aucun abonnement.',
    color: 'var(--accent-light)',
    glow: 'var(--accent-glow)',
  },
]

const CHAT_PREVIEWS = [
  { role: 'user', text: 'Où est-ce que je dépense trop ?' },
  { role: 'ai', text: '📊 Vos plus grosses dépenses ce mois : **Alimentation** (342 €), **Transport** (210 €), **Abonnements** (89 €). Je recommande de revoir vos abonnements — plusieurs semblent inactifs.' },
  { role: 'user', text: 'Donne-moi 3 conseils pour économiser' },
  { role: 'ai', text: '💡 **1.** Regroupez vos courses en une seule sortie hebdomadaire.\n**2.** Résiliez les abonnements non utilisés (Netflix, Spotify…).\n**3.** Préparez vos repas en avance pour éviter les restaurants.' },
]

export default function Landing() {
  return (
    <div className="landing">
      {/* Nav */}
      <header className="landing-nav">
        <div className="landing-nav-logo">
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32, fontSize: 14 }}>Fx</div>
          <span className="sidebar-logo-text" style={{ fontSize: 18 }}>Finox</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/auth" className="btn btn-secondary" style={{ fontSize: 13, padding: '7px 14px' }}>
            Se connecter
          </Link>
          <Link to="/auth" className="btn btn-primary" style={{ fontSize: 13, padding: '7px 14px' }}>
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-badge">
          <Sparkles size={13} />
          Créé par Alexis Boukandoura
        </div>

        <h1 className="landing-hero-title">
          Your AI Personal<br />
          <span className="landing-hero-gradient">Finance Assistant</span>
        </h1>

        <p className="landing-hero-sub">
          Chat with your money, get smart insights.<br />
          Importez vos données bancaires, posez vos questions en français.
        </p>

        <div className="landing-hero-cta">
          <Link to="/auth" className="btn btn-primary landing-cta-primary">
            Commencer maintenant <ArrowRight size={17} />
          </Link>
          <Link to="/dashboard" className="btn btn-secondary landing-cta-secondary">
            Tableau de bord
          </Link>
        </div>

        {/* Mock chat preview */}
        <div className="landing-chat-demo">
          <div className="landing-chat-demo-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, var(--accent), #5b4fc7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>AI</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Finox AI</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              En ligne
            </div>
          </div>
          <div className="landing-chat-demo-body">
            {CHAT_PREVIEWS.map((msg, i) => (
              <div key={i} className={`landing-chat-msg ${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="landing-chat-avatar">AI</div>
                )}
                <div
                  className="landing-chat-bubble"
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            ))}
          </div>
          <div className="landing-chat-demo-input">
            <Zap size={13} color="var(--accent)" />
            <span>Analyse mon mois de janvier…</span>
            <div className="landing-chat-demo-send"><ArrowRight size={13} /></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <p className="landing-section-eyebrow">Fonctionnalités</p>
        <h2 className="landing-section-title">Tout ce dont vous avez besoin</h2>
        <p className="landing-section-sub">Un assistant financier complet, sans abonnement, sans serveur.</p>
        <div className="landing-features-grid">
          {FEATURES.map(({ icon: Icon, title, desc, color, glow }) => (
            <div key={title} className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: glow, color }}>
                <Icon size={20} />
              </div>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-bottom-cta">
        <div className="landing-bottom-cta-inner">
          <h2 className="landing-bottom-title">Prêt à maîtriser vos finances ?</h2>
          <p className="landing-bottom-sub">
            Gratuit · Local · Privé · Aucune inscription requise
          </p>
          <Link to="/auth" className="btn btn-primary landing-cta-primary">
            Créer mon compte <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© 2025 Finox v1.0.0</span>
        <span className="landing-footer-sep">·</span>
        <span>Créé par Alexis Boukandoura</span>
        <span className="landing-footer-sep">·</span>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Application</Link>
      </footer>
    </div>
  )
}
