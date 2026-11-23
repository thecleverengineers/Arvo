import { useEffect, useRef, useState } from 'react'
import { api, formatINR } from './lib/api.js'

const themes = [
  { id: 'emerald', name: 'Emerald Luxe', colors: ['#123c31', '#d4b873'] },
  { id: 'obsidian', name: 'Obsidian Gold', colors: ['#20201e', '#d1b36a'] },
  { id: 'ivory', name: 'Ivory Champagne', colors: ['#f5f0e6', '#ae8b4d'] },
  { id: 'sapphire', name: 'Midnight Sapphire', colors: ['#18273e', '#9db4d6'] },
  { id: 'burgundy', name: 'Burgundy Rose', colors: ['#552c3a', '#d8a39e'] },
]

const iconPaths = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 15h2"/><path d="M6 5V3h12"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  arrowDown: <><path d="M12 4v12m-5-5 5 5 5-5"/><path d="M5 20h14"/></>,
  arrowUp: <><path d="M12 20V8m-5 5 5-5 5 5"/><path d="M5 4h14"/></>,
  chart: <><path d="M4 19V5m0 14h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
  gift: <><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8H8.5a2.5 2.5 0 1 1 2.45-3h1.05m0 3h3.5a2.5 2.5 0 1 0-2.45-3H12"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  swap: <><path d="m16 3 4 4-4 4M4 7h16M8 21l-4-4 4-4m12 4H4"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9 1-1.9 1.2-1.9 2.9M12 17h.01"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
}

function Icon({ name, size = 20, strokeWidth = 1.7 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] || iconPaths.spark}</svg>
}

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('Home')
  const [theme, setTheme] = useState(() => localStorage.getItem('arvo-theme') || 'emerald')
  const [themeOpen, setThemeOpen] = useState(false)
  const [plans, setPlans] = useState([])
  const [settings, setSettings] = useState({ paymentMethods: [], languages: ['en'], themes: themes.map((item) => item.id) })
  const [wallet, setWallet] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [news, setNews] = useState([])
  const [brandLogo, setBrandLogo] = useState('')
  const [brandIcon, setBrandIcon] = useState('')
  const [activePlan, setActivePlan] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [action, setAction] = useState(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const notify = (message) => {
    setToast(message)
    window.clearTimeout(window.arvoToastTimer)
    window.arvoToastTimer = window.setTimeout(() => setToast(''), 3000)
  }

  async function loadPublicData() {
    const [planData, settingData, newsData, logoData, iconData] = await Promise.allSettled([api('/plans'), api('/settings'), api('/content/news'), api('/content/logo'), api('/content/icon')])
    if (planData.status === 'fulfilled') setPlans(planData.value.plans || [])
    if (settingData.status === 'fulfilled') setSettings(settingData.value)
    if (newsData.status === 'fulfilled') setNews(newsData.value.items || [])
    if (logoData.status === 'fulfilled') setBrandLogo(logoData.value.items?.[0]?.imageUrl || '')
    if (iconData.status === 'fulfilled') setBrandIcon(iconData.value.items?.[0]?.imageUrl || '')
  }

  async function loadAccountData() {
    const [walletData, referralData] = await Promise.allSettled([api('/wallet'), api('/referrals')])
    if (walletData.status === 'fulfilled') setWallet(walletData.value)
    if (referralData.status === 'fulfilled') setReferrals(referralData.value)
  }

  useEffect(() => {
    let active = true
    Promise.all([loadPublicData(), api('/auth/me').then((result) => result.user).catch(() => null)])
      .then(([, currentUser]) => { if (active && currentUser) setUser(currentUser) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => { if (user) loadAccountData(); else { setWallet(null); setReferrals(null) } }, [user?.id])
  useEffect(() => { localStorage.setItem('arvo-theme', theme) }, [theme])
  useEffect(() => {
    if (!brandIcon) return
    let link = document.querySelector('link[rel="icon"]')
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = brandIcon
  }, [brandIcon])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('verifyEmail')
    if (token) {
      api('/auth/email/verify', { method: 'POST', body: { token } })
        .then(async () => { const account = await api('/auth/me').then((result) => result.user).catch(() => null); if (account) setUser(account); notify('Email verified') })
        .catch((error) => notify(error.message))
        .finally(() => { window.history.replaceState({}, '', window.location.pathname) })
    }
  }, [])

  const openPlan = (plan) => { setActivePlan(plan); setPage('Plans'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const navigate = (nextPage) => { setPage(nextPage); setActivePlan(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* Local session still clears. */ }
    setUser(null); setWallet(null); setReferrals(null); setPage('Home'); notify('Signed out')
  }

  async function submitPlan(plan, amount, requestKey) {
    const result = await api(`/plans/${plan.id}/apply`, { method: 'POST', body: { amount }, headers: { 'Idempotency-Key': requestKey } })
    notify('Plan request sent for administrator review')
    await loadAccountData()
    return result
  }

  async function submitWalletAction(type, form, requestKey) {
    const routes = { deposit: ['/deposits', form], withdrawal: ['/withdrawals', form], transfer: ['/transfers', form] }
    const [path, body] = routes[type]
    await api(path, { method: 'POST', body, headers: { 'Idempotency-Key': requestKey } })
    setAction(null)
    await loadAccountData()
    notify(type === 'deposit' ? 'Deposit request sent for review' : type === 'withdrawal' ? 'Withdrawal request reserved for review' : 'Transfer completed')
  }

  async function saveProfile(form) {
    const result = await api('/profile', { method: 'PATCH', body: form })
    setUser(result.user)
    notify('Profile updated')
  }

  async function verifyProfile() {
    const result = await api('/profile/verification', { method: 'POST', body: {} })
    setUser(result.user)
    notify(result.message)
  }

  async function sendEmailVerification() {
    await api('/auth/email/send-verification', { method: 'POST', body: { email: user.email } })
    notify('Verification email sent')
  }

  const navItems = [['Home','home'],['Plans','layers'],['Wallet','wallet'],['Referrals','users'],['Profile','user']]
  if (user?.role === 'admin') navItems.push(['Admin','shield'])
  const currentTheme = themes.find((item) => item.id === theme) || themes[0]

  return <div className="app-shell" data-theme={theme}>
    <header className="topbar">
      <button className="brand" onClick={() => navigate('Home')} aria-label="Arvo home">{brandLogo ? <img className="brand-image" src={brandLogo} alt="Arvo"/> : <><span className="brand-mark">A</span><span className="brand-word">arvo<span>.</span></span></>}</button>
      <div className="topbar-right">
        <div className="theme-wrap">
          <button className="theme-button" onClick={() => setThemeOpen(!themeOpen)}><span className="theme-dots">{currentTheme.colors.map((color) => <i key={color} style={{ background: color }}/>)}</span><span className="theme-button-label">{currentTheme.name}</span><span className="tiny-caret">⌄</span></button>
          {themeOpen && <div className="theme-menu">{themes.filter((item) => settings.themes?.includes(item.id)).map((item) => <button key={item.id} onClick={() => { setTheme(item.id); setThemeOpen(false) }}><span className="theme-dots">{item.colors.map((color) => <i key={color} style={{ background: color }}/>)}</span><span>{item.name}</span>{theme === item.id && <Icon name="check" size={15}/>}</button>)}</div>}
        </div>
        {user ? <><button className="icon-button notification-button" aria-label="Support chat" onClick={() => navigate('Support')}><Icon name="bell"/><i/></button><button className="avatar-button" onClick={() => navigate('Profile')} aria-label="Open profile">{initials(user.name)}</button></> : <button className="secondary-button top-signin" onClick={() => setLoginOpen(true)}>Sign in</button>}
      </div>
    </header>

    <main className="main-content">
      {loading ? <div className="loading-state"><span className="loading-mark">A</span><span>Preparing your Arvo experience…</span></div> : !user ? <>
        {page === 'Plans' && !activePlan && <PlansPage plans={plans} onOpenPlan={openPlan}/>}
        {page !== 'Plans' && <SignedOutPage plans={plans} onSignIn={() => setLoginOpen(true)} onBrowse={() => navigate('Plans')} onOpenPlan={openPlan}/>}
        {activePlan && <PlanDetail plan={activePlan} onBack={() => setActivePlan(null)} signedOut onSignIn={() => setLoginOpen(true)}/>}
      </> : <>
        {page === 'Home' && !activePlan && <HomePage user={user} wallet={wallet} referrals={referrals} plans={plans} news={news} onOpenPlan={openPlan} setPage={navigate} notify={notify}/>}
        {page === 'Plans' && !activePlan && <PlansPage plans={plans} onOpenPlan={openPlan}/>}
        {page === 'Plans' && activePlan && <PlanDetail plan={activePlan} onBack={() => setActivePlan(null)} onApply={submitPlan}/>}
        {page === 'Wallet' && <WalletPage wallet={wallet} onAction={setAction} notify={notify}/>}
        {page === 'Referrals' && <ReferralPage referrals={referrals} notify={notify}/>}
        {page === 'Profile' && <ProfilePage user={user} onSave={saveProfile} onVerify={verifyProfile} onSendEmail={sendEmailVerification} onSupport={() => navigate('Support')} onAdmin={() => navigate('Admin')} onLogout={logout} notify={notify}/>}
        {page === 'Support' && <SupportChat notify={notify}/>}
        {page === 'Admin' && user.role === 'admin' && <AdminPage notify={notify} onRefresh={async () => { await loadPublicData(); await loadAccountData() }}/>}
      </>}
    </main>

    {user && <nav className="bottom-nav" aria-label="Main navigation">{navItems.map(([label, icon]) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => navigate(label)}><Icon name={icon} size={20}/><span>{label}</span></button>)}</nav>}
    {loginOpen && <AuthModal onClose={() => setLoginOpen(false)} notify={notify} onSignedIn={(nextUser) => { setUser(nextUser); setLoginOpen(false); setPage('Home') }}/>}
    {action && <WalletActionModal type={action} methods={settings.paymentMethods || []} onClose={() => setAction(null)} onSubmit={submitWalletAction} notify={notify}/>}
    {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={14}/></span>{toast}</div>}
  </div>
}

function initials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A' }
function newRequestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }
function EmptyState({ title, description, action }) { return <div className="empty-state"><span className="empty-icon"><Icon name="layers" size={22}/></span><h3>{title}</h3><p>{description}</p>{action}</div> }
function StatusPill({ status }) { const label = status?.replaceAll('_', ' ') || 'pending'; return <span className={`status-pill state-${label.replaceAll(' ', '-')}`}>{label}</span> }

function SignedOutPage({ plans, onSignIn, onBrowse, onOpenPlan }) {
  return <div className="signed-out-page"><section className="signed-out-copy"><span className="eyebrow">WEALTH, THOUGHTFULLY</span><h1>A clearer view of your financial journey<span className="greeting-dot">.</span></h1><p>Explore available plans, manage requests and keep your account details in one considered place.</p><div className="signed-out-actions"><button className="primary-button" onClick={onSignIn}>Continue with mobile OTP <Icon name="chevron" size={17}/></button><button className="text-button" onClick={onBrowse}>Explore plans</button></div><div className="trust-note"><Icon name="lock" size={16}/> Secure access with mobile verification</div></section><aside className="signed-out-panel"><div className="signed-panel-top"><span className="brand-mark">A</span><span className="eyebrow">ARVO ACCOUNT</span></div><div className="signed-panel-orbit"><span/><span/><strong>A</strong></div><div className="signed-panel-foot"><span>Personal dashboard</span><span>Plans · Wallet · Referrals</span></div></aside><section className="public-plans-preview"><div className="section-heading"><div><span className="eyebrow">EXPLORE ARVO</span><h2>Available investment plans</h2></div><button className="inline-link" onClick={onBrowse}>View plans <Icon name="chevron" size={15}/></button></div>{plans.length ? <div className="plan-grid home-plans">{plans.slice(0, 2).map((plan, index) => <PlanCard plan={plan} index={index} key={plan.id} onOpen={onOpenPlan}/>)}</div> : <p className="muted-line">Plans will appear here when published by the administrator.</p>}</section></div>
}

function PlanCard({ plan, onOpen, compact = false, index = 0 }) {
  const tint = ['gold', 'green', 'blue'][index % 3]
  return <button className={`plan-card ${compact ? 'plan-card-compact' : ''}`} onClick={() => onOpen(plan)}>
    <div className={`plan-art ${tint}`}><span className="plan-symbol"><Icon name={['sun','spark','shield'][index % 3]} size={26}/></span><span className="plan-art-label">ARVO · PLAN PROFILE</span><span className="plan-orbit orbit-one"/><span className="plan-orbit orbit-two"/></div>
    <div className="plan-card-body"><span className="eyebrow">{plan.category || 'INVESTMENT PLAN'}</span><div className="plan-title-row"><h3>{plan.name}</h3><Icon name="chevron" size={17}/></div><p>{plan.summary || 'Open this plan profile to review its published details and terms.'}</p><div className="plan-meta"><span>Minimum <b>{formatINR(plan.minimumPaise, true)}</b></span><span className="meta-dot"/><span>{plan.termMonths} months</span></div></div>
  </button>
}

function HomePage({ user, wallet, referrals, plans, news, onOpenPlan, setPage }) {
  const available = wallet?.wallet?.availablePaise || 0
  const invested = wallet?.wallet?.investedPaise || 0
  const reserved = wallet?.wallet?.reservedPaise || 0
  const total = available + invested + reserved
  const transactions = wallet?.transactions || []
  return <>
    <section className="welcome-row"><div><span className="eyebrow">YOUR ARVO OVERVIEW</span><h1>Welcome, {user.name?.split(' ')[0] || 'there'}<span className="greeting-dot">.</span></h1><p>Your account activity, clearly brought together.</p></div><button className="help-link" onClick={() => setPage('Support')}><Icon name="help" size={17}/> Live chat support</button></section>
    <section className="hero-grid"><div className="balance-card"><div className="balance-card-top"><span className="balance-label"><span className="live-dot"/> ACCOUNT VALUE</span><Icon name="spark" size={17}/></div><div className="balance-value">{formatINR(total / 100)}<span className="balance-decimal"> INR</span></div><div className="balance-change"><span>Available balance + active plan value + reserved requests</span></div><div className="balance-footer"><div><span>Invested</span><strong>{formatINR(invested, true)}</strong></div><div><span>Available</span><strong>{formatINR(available, true)}</strong></div><button className="balance-arrow" onClick={() => setPage('Wallet')} aria-label="View wallet"><Icon name="chevron" size={20}/></button></div><div className="hero-line" aria-hidden="true"><svg viewBox="0 0 560 110" preserveAspectRatio="none"><path d="M0 93 C38 83 42 58 76 66 S119 87 153 65 198 41 229 58 275 75 305 48 352 39 382 47 426 26 460 38 503 14 560 9" fill="none" stroke="currentColor" strokeWidth="2"/></svg></div></div><div className="side-cards"><div className="small-stat-card"><div className="stat-card-top"><span className="stat-icon"><Icon name="wallet" size={18}/></span><span className="eyebrow">RESERVED</span></div><strong>{formatINR(reserved, true)}</strong><span className="stat-caption">Withdrawal requests under review</span></div><div className="small-stat-card second-stat"><div className="stat-card-top"><span className="stat-icon lavender"><Icon name="layers" size={18}/></span><span className="eyebrow">ACTIVE PLANS</span></div><strong>{wallet?.positions?.length || 0}</strong><button className="inline-link" onClick={() => setPage('Plans')}>View plans <Icon name="chevron" size={14}/></button></div></div></section>
    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">AVAILABLE TO REVIEW</span><h2>Investment plans</h2></div><button className="inline-link" onClick={() => setPage('Plans')}>View all <Icon name="chevron" size={15}/></button></div>{plans.length ? <div className="plan-grid home-plans">{plans.slice(0, 2).map((plan, index) => <PlanCard key={plan.id} plan={plan} index={index} compact onOpen={onOpenPlan}/>)}</div> : <EmptyState title="No plans are published yet" description="Published plans will appear here with their own profile and terms."/>}</section>
    <section className="section-block activity-block"><div className="section-heading"><div><span className="eyebrow">ACCOUNT LEDGER</span><h2>Recent activity</h2></div><button className="inline-link" onClick={() => setPage('Wallet')}>Open wallet <Icon name="chevron" size={15}/></button></div>{transactions.length ? <TransactionList items={transactions.slice(0, 4)}/> : <EmptyState title="No activity yet" description="Your wallet transactions will appear here."/>}</section>
    {news.length > 0 && <section className="section-block"><div className="section-heading"><div><span className="eyebrow">ARVO JOURNAL</span><h2>News & updates</h2></div></div><div className="news-grid">{news.slice(0, 3).map((item) => <article className="news-card" key={item._id}>{item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy"/>}<div><span className="eyebrow">{new Date(item.createdAt).toLocaleDateString()}</span><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div></section>}
    <div className="demo-note"><span className="demo-mark">i</span><span>Wallet figures reflect approved account records. Plan terms are shown as published by the administrator.</span></div>
  </>
}

function PlansPage({ plans, onOpenPlan }) {
  return <><PageHeading eyebrow="THOUGHTFULLY CURATED" title="Investment plans" subtitle="Review each plan profile and its published terms before submitting a request."/><div className="plan-intro"><div className="intro-seal"><Icon name="spark" size={24}/></div><div><strong>Clear information at every step.</strong><p>Applications are reviewed before funds are moved from your available wallet balance.</p></div></div>{plans.length ? <div className="plan-grid all-plans">{plans.map((plan, index) => <PlanCard key={plan.id} plan={plan} index={index} onOpen={onOpenPlan}/>)}</div> : <EmptyState title="No active plans" description="The administrator has not published an investment plan yet."/>}<div className="demo-note"><span className="demo-mark">i</span><span>Plan profiles display administrator-published terms. Review the official plan documents and risks before applying.</span></div></>
}

function PlanDetail({ plan, onBack, onApply, signedOut, onSignIn }) {
  const [amount, setAmount] = useState('')
  const [requestKey, setRequestKey] = useState(newRequestKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (signedOut) return onSignIn()
    setBusy(true); setError('')
    try { await onApply(plan, amount, requestKey); setAmount(''); setRequestKey(newRequestKey()) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <><button className="back-link" onClick={onBack}>← <span>All investment plans</span></button><div className="detail-grid"><div><div className="detail-art plan-art green"><span className="plan-symbol"><Icon name="spark" size={34}/></span><span className="plan-art-label">ARVO · PLAN PROFILE</span><span className="plan-orbit orbit-one"/><span className="plan-orbit orbit-two"/></div><div className="detail-overview"><span className="eyebrow">{plan.category || 'INVESTMENT PLAN'}</span><h1>{plan.name}</h1><p>{plan.summary}</p></div><div className="detail-panel"><span className="eyebrow">PLAN OVERVIEW</span><h2>Published information</h2><p>{plan.details || 'The administrator has not added further plan information.'}</p><div className="detail-facts"><div><span>Minimum amount</span><strong>{formatINR(plan.minimumPaise, true)}</strong></div><div><span>Investment horizon</span><strong>{plan.termMonths} months</strong></div><div><span>Risk information</span><strong>{plan.riskLabel || 'See plan documents'}</strong></div><div><span>Terms document</span><strong>{plan.termsUrl ? <a href={plan.termsUrl} target="_blank" rel="noreferrer">Open terms</a> : 'Not supplied'}</strong></div></div></div></div><aside className="detail-aside"><span className="eyebrow">APPLICATION</span><h3>Request this plan.</h3><p>Submitting an application does not move funds. The administrator reviews it first.</p><div className="aside-divider"/><div className="aside-row"><span>Minimum amount</span><strong>{formatINR(plan.minimumPaise, true)}</strong></div><div className="aside-row"><span>Term</span><strong>{plan.termMonths} months</strong></div><form onSubmit={submit}><label className="field-label" htmlFor="apply-amount">Requested amount (₹)</label><input className="form-input" id="apply-amount" value={amount} onChange={(event) => { setAmount(event.target.value); setRequestKey(newRequestKey()) }} placeholder="Enter amount" inputMode="decimal" required/><button className="primary-button full-button apply-button" disabled={busy}>{busy ? 'Submitting…' : signedOut ? 'Sign in to continue' : 'Submit application'} <Icon name="chevron" size={16}/></button></form>{error && <p className="form-error">{error}</p>}<span className="small-legal">No guaranteed returns are displayed in this profile.</span></aside></div></>
}

function WalletPage({ wallet, onAction, notify }) {
  const account = wallet?.wallet || { availablePaise: 0, investedPaise: 0, reservedPaise: 0 }
  const deposits = wallet?.deposits || []
  const withdrawals = wallet?.withdrawals || []
  return <><PageHeading eyebrow="YOUR MONEY, IN ONE PLACE" title="Wallet" subtitle="Track approved credits, transfer requests and wallet activity." action={<button className="secondary-button" onClick={() => onAction('deposit')}>+ Add funds</button>}/><section className="wallet-overview"><div className="wallet-main-balance"><span className="eyebrow">AVAILABLE BALANCE</span><strong>{formatINR(account.availablePaise, true)}</strong><p>Only approved credits appear as available balance.</p><div className="wallet-actions"><button className="primary-button" onClick={() => onAction('deposit')}><Icon name="arrowDown" size={17}/> Deposit request</button><button className="outline-button" onClick={() => onAction('transfer')}><Icon name="swap" size={17}/> Transfer</button><button className="outline-button" onClick={() => onAction('withdrawal')}><Icon name="arrowUp" size={17}/> Withdraw</button></div></div><div className="wallet-mini"><div><span className="eyebrow">INVESTED</span><strong>{formatINR(account.investedPaise, true)}</strong></div><div><span className="eyebrow">RESERVED FOR WITHDRAWALS</span><strong className="accent-text">{formatINR(account.reservedPaise, true)}</strong></div></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">ACCOUNT HISTORY</span><h2>Transactions</h2></div></div>{wallet?.transactions?.length ? <TransactionList items={wallet.transactions}/> : <EmptyState title="No transactions yet" description="Approved deposits, transfers and plan applications will be listed here."/>}</section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">REQUEST TRACKING</span><h2>Deposits and withdrawals</h2></div></div><div className="request-list">{[...deposits.map((item) => ({ ...item, type: 'Deposit' })), ...withdrawals.map((item) => ({ ...item, type: 'Withdrawal' }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((item) => <div className="request-row" key={`${item.type}-${item._id}`}><div><strong>{item.type} · {formatINR(item.amountPaise, true)}</strong><span>{new Date(item.createdAt).toLocaleString()}</span></div><StatusPill status={item.status}/></div>)}</div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">INVESTMENT TRACKING</span><h2>Plan applications</h2></div></div>{wallet?.planApplications?.length ? <div className="request-list">{wallet.planApplications.map((item) => <div className="request-row" key={item._id}><div><strong>{item.planName} · {formatINR(item.amountPaise, true)}</strong><span>Submitted {new Date(item.createdAt).toLocaleString()}</span></div><StatusPill status={item.status}/></div>)}</div> : <EmptyState title="No plan applications yet" description="Requests and administrator decisions will be shown here."/>}</section><div className="demo-note"><span className="demo-mark">i</span><span>Deposits are credited only after an administrator confirms the external payment reference. Withdrawal payout is manually handled after review.</span></div></>
}

function TransactionList({ items }) {
  return <div className="transaction-list">{items.map((item, index) => {
    const credit = item.direction === 'credit'
    const title = item.description || item.kind?.replaceAll('_', ' ') || 'Wallet transaction'
    return <div className="transaction-row" key={item._id || index}><span className={`transaction-icon ${credit ? 'positive' : 'neutral'}`}><Icon name={credit ? 'arrowDown' : 'chart'} size={18}/></span><div className="transaction-description"><strong>{title}</strong><span>{new Date(item.createdAt).toLocaleString()} · {item.status || 'posted'}</span></div><strong className={`transaction-amount ${credit ? 'positive' : 'neutral'}`}>{credit ? '+' : '−'} {formatINR(item.amountPaise, true)}</strong></div>
  })}</div>
}

function ReferralPage({ referrals, notify }) {
  const levels = referrals?.levels || [1, 2, 3].map((level) => ({ level, count: 0, members: [] }))
  async function copyCode() {
    if (!referrals?.referralCode) return notify('Your referral code will appear after you sign in.')
    try { await navigator.clipboard.writeText(referrals.referralCode); notify('Referral code copied') } catch { notify(`Referral code: ${referrals.referralCode}`) }
  }
  return <><PageHeading eyebrow="GROW TOGETHER" title="Your referral circle" subtitle="Review account referrals across the three configured levels."/><section className="referral-hero"><div className="referral-copy"><span className="eyebrow">YOUR INVITE CODE</span><h2>Good things are<br/>better shared.</h2><p>Share your code with someone joining Arvo.</p><div className="invite-code"><span>{referrals?.referralCode || '—'}</span><button onClick={copyCode} aria-label="Copy invite code"><Icon name="copy" size={17}/></button></div></div><div className="referral-illustration"><div className="referral-ring ring-a"/><div className="referral-ring ring-b"/><div className="referral-center">A</div><span className="referral-node node-one">1</span><span className="referral-node node-two">2</span><span className="referral-node node-three">3</span><span className="referral-node node-four">+</span></div></section><section className="referral-stats"><div><span className="eyebrow">TOTAL NETWORK</span><strong>{referrals?.totalMembers || 0}</strong><span>across three levels</span></div><div><span className="eyebrow">LEVEL 1</span><strong>{levels[0]?.count || 0}</strong><span>direct referrals</span></div><div><span className="eyebrow">LEVEL 2 + 3</span><strong>{(levels[1]?.count || 0) + (levels[2]?.count || 0)}</strong><span>extended network</span></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">THREE LEVELS</span><h2>Referral breakdown</h2></div></div><div className="level-list">{levels.map((level) => <div className="level-card" key={level.level}><span className={`level-icon ${['level-green','level-gold','level-blue'][(level.level - 1) % 3]}`}><Icon name="users" size={19}/></span><div className="level-content"><strong>Level {level.level}</strong><span>{level.level === 1 ? 'People you invited directly' : `Referrals through level ${level.level - 1}`}</span></div><div className="level-people"><strong>{level.count} members</strong><span>tracked accounts</span></div><span className="level-rate"><Icon name="chevron" size={17}/></span></div>)}</div></section><div className="demo-note"><span className="demo-mark">i</span><span>Referral tracking follows the three-level account tree. Reward or commission rules are not enabled in this build.</span></div></>
}

function ProfilePage({ user, onSave, onVerify, onSendEmail, onSupport, onAdmin, onLogout, notify }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [busy, setBusy] = useState(false)
  async function save(event) { event.preventDefault(); setBusy(true); try { await onSave({ name, email }); setEditing(false) } catch (error) { notify(error.message) } finally { setBusy(false) } }
  async function run(action) { setBusy(true); try { await action() } catch (error) { notify(error.message) } finally { setBusy(false) } }
  return <><PageHeading eyebrow="YOUR ARVO ACCOUNT" title="Profile & verification" subtitle="Manage your account details and verification status."/><section className="profile-card"><div className="profile-avatar">{initials(user.name)}</div><div className="profile-details"><span className="eyebrow">{user.role === 'admin' ? 'ADMINISTRATOR' : 'ARVO MEMBER'}</span><h2>{user.name || 'Arvo member'}</h2><p>+91 {user.mobile} {user.email ? `· ${user.email}` : ''}</p></div><button className="outline-button profile-edit" onClick={() => setEditing(!editing)}>{editing ? 'Close' : 'Edit profile'}</button></section>{editing && <form className="profile-edit-form" onSubmit={save}><label>Name<input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required minLength="2"/></label><label>Email<input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form>}<section className="verification-section"><div className="section-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2>Verification status</h2></div></div><div className="verification-list"><div className="verification-row"><span className={`verification-icon ${user.emailVerified ? 'verified' : 'pending'}`}><Icon name={user.emailVerified ? 'check' : 'user'} size={18}/></span><div><strong>Email address</strong><span>{user.email || 'No email address added'}</span></div>{user.emailVerified ? <StatusPill status="verified"/> : <button className="inline-link" disabled={busy || !user.email} onClick={() => run(onSendEmail)}>Verify email <Icon name="chevron" size={14}/></button>}</div><div className="verification-row"><span className={`verification-icon ${user.profileStatus === 'verified' ? 'verified' : 'pending'}`}><Icon name={user.profileStatus === 'verified' ? 'check' : 'user'} size={18}/></span><div><strong>Profile verification</strong><span>{user.profileStatus === 'verified' ? 'Your profile is verified' : 'Submit your profile for administrator review'}</span></div>{user.profileStatus === 'verified' ? <StatusPill status="verified"/> : user.profileStatus === 'pending' ? <StatusPill status="pending"/> : <button className="inline-link" disabled={busy} onClick={() => run(onVerify)}>Submit <Icon name="chevron" size={14}/></button>}</div><div className="verification-row"><span className="verification-icon verified"><Icon name="check" size={18}/></span><div><strong>Mobile number</strong><span>+91 {user.mobile}</span></div><StatusPill status="verified"/></div></div></section><section className="profile-bottom-grid"><div className="preferences-card"><span className="eyebrow">PREFERENCES</span><h3>Your experience</h3><div className="preference-row"><span>Language</span><strong>English</strong></div><div className="preference-row"><span>Appearance</span><strong>{themes.find((item) => item.id === localStorage.getItem('arvo-theme'))?.name || 'Emerald Luxe'}</strong></div></div><div className="support-card"><span className="support-icon"><Icon name="help" size={19}/></span><div><span className="eyebrow">ACCOUNT SUPPORT</span><h3>Live chat</h3><p>Message the Arvo administrator from your account.</p><button className="inline-link" onClick={onSupport}>Open conversation <Icon name="chevron" size={14}/></button></div></div></section><div className="profile-actions">{user.role === 'admin' && <button className="outline-button" onClick={onAdmin}><Icon name="shield" size={16}/> Open admin panel</button>}<button className="text-button" onClick={onLogout}>Sign out</button></div></>
}

function AuthModal({ onClose, onSignedIn, notify }) {
  const [mobile, setMobile] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [referralCode, setReferralCode] = useState(new URLSearchParams(window.location.search).get('ref') || '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => { if (!seconds) return undefined; const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer) }, [seconds])
  async function send(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await api('/auth/otp/send', { method: 'POST', body: { mobile } }); setOtpSent(true); setDemoOtp(result.demoOtp || ''); setSeconds(60); notify(result.demoOtp ? `Local preview OTP: ${result.demoOtp}` : 'OTP sent') }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function verify(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await api('/auth/otp/verify', { method: 'POST', body: { mobile, otp, name, email, referralCode } }); onSignedIn(result.user); notify(`Welcome to Arvo, ${result.user.name || 'member'}`) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function resend() { if (seconds || busy) return; setBusy(true); setError(''); try { const result = await api('/auth/otp/send', { method: 'POST', body: { mobile } }); setDemoOtp(result.demoOtp || ''); setSeconds(60); notify('A new code has been sent') } catch (err) { setError(err.message) } finally { setBusy(false) } }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="login-modal"><button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close"/></button><span className="brand-mark modal-brand-mark">A</span><span className="eyebrow">WELCOME TO ARVO</span><h2>{otpSent ? 'Verify your number' : 'A more considered way forward.'}</h2><p>{otpSent ? `Enter the one-time code sent to +91 ${mobile}.` : 'Sign in or create your account with a secure mobile OTP.'}</p>{!otpSent ? <form onSubmit={send} className="auth-form"><label className="field-label" htmlFor="auth-name">Name <span className="optional-label">Required for new accounts</span></label><input className="form-input" id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" minLength="2"/><label className="field-label" htmlFor="auth-phone">Mobile number</label><div className="phone-field"><span>+91</span><input id="auth-phone" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" inputMode="numeric" required pattern="[0-9]{10}"/></div><label className="field-label" htmlFor="auth-email">Email address <span className="optional-label">Optional</span></label><input className="form-input" id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/><label className="field-label" htmlFor="auth-referral">Referral code <span className="optional-label">Optional</span></label><input className="form-input" id="auth-referral" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} placeholder="ARVO••••••••"/><button className="primary-button full-button" disabled={busy}>{busy ? 'Sending…' : 'Send secure OTP'} <Icon name="chevron" size={17}/></button></form> : <form onSubmit={verify} className="auth-form"><label className="field-label" htmlFor="auth-otp">One-time password</label><input className="form-input otp-entry" id="auth-otp" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" required/><label className="field-label" htmlFor="auth-name-confirm">Name <span className="optional-label">Required for new accounts</span></label><input className="form-input" id="auth-name-confirm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" minLength="2"/><button className="primary-button full-button" disabled={busy || otp.length < 4}>{busy ? 'Verifying…' : 'Verify and continue'} <Icon name="chevron" size={17}/></button><button className="text-button centered" type="button" onClick={resend} disabled={busy || seconds > 0}>{seconds ? `Resend code in ${seconds}s` : 'Resend code'}</button>{demoOtp && <p className="demo-otp-note">Local demo mode code: <strong>{demoOtp}</strong></p>}</form>}{error && <p className="form-error">{error}</p>}<div className="modal-security"><Icon name="lock" size={14}/> Your verification code is handled securely.</div></div></div>
}

function WalletActionModal({ type, methods, onClose, onSubmit, notify }) {
  const [amount, setAmount] = useState('')
  const [requestKey, setRequestKey] = useState(newRequestKey)
  const [methodKey, setMethodKey] = useState(methods[0]?.key || '')
  const [paymentReference, setPaymentReference] = useState('')
  const [recipientMobile, setRecipientMobile] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const method = methods.find((item) => item.key === methodKey)
  const title = type === 'deposit' ? 'Request a deposit' : type === 'withdrawal' ? 'Request a withdrawal' : 'Transfer to an Arvo member'
  const update = (setter, value) => { setter(value); setRequestKey(newRequestKey()) }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const payload = type === 'deposit' ? { amount, methodKey, paymentReference } : type === 'withdrawal' ? { amount, payoutNote: note } : { amount, recipientMobile, note }
    try { await onSubmit(type, payload, requestKey); setRequestKey(newRequestKey()) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="action-modal"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><span className="eyebrow">WALLET</span><h2>{title}</h2><p>{type === 'deposit' ? 'Submit a payment reference after paying through one of the enabled methods.' : type === 'withdrawal' ? 'Your available balance is reserved while an administrator reviews the request.' : 'Transfers move funds immediately between active Arvo wallets.'}</p><form className="action-form" onSubmit={submit}><label className="field-label" htmlFor="wallet-amount">Amount (₹)</label><input className="form-input" id="wallet-amount" value={amount} onChange={(e) => update(setAmount, e.target.value)} inputMode="decimal" placeholder="0.00" required/>{type === 'deposit' && <><label className="field-label" htmlFor="deposit-method">Payment method</label><select className="form-input" id="deposit-method" value={methodKey} onChange={(e) => update(setMethodKey, e.target.value)} required><option value="">Choose a method</option>{methods.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>{method && <div className="payment-instructions"><strong>{method.label}</strong><p>{method.instructions}</p></div>}<label className="field-label" htmlFor="payment-reference">Payment reference / UTR</label><input className="form-input" id="payment-reference" value={paymentReference} onChange={(e) => update(setPaymentReference, e.target.value)} placeholder="Reference from your payment" required minLength="6"/></>}{type === 'transfer' && <><label className="field-label" htmlFor="recipient-mobile">Recipient mobile</label><div className="phone-field"><span>+91</span><input id="recipient-mobile" value={recipientMobile} onChange={(e) => update(setRecipientMobile, e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" inputMode="numeric" required/></div><label className="field-label" htmlFor="transfer-note">Note <span className="optional-label">Optional</span></label><input className="form-input" id="transfer-note" value={note} onChange={(e) => update(setNote, e.target.value)} maxLength="160" placeholder="Add a note"/></>}{type === 'withdrawal' && <div className="payment-instructions"><strong>Payout processing</strong><p>After approval, the administrator will contact you through the verified account details. Add a short note if needed; do not enter bank passwords or OTPs here.</p><input className="form-input" value={note} onChange={(e) => update(setNote, e.target.value)} maxLength="300" placeholder="Optional payout note"/></div>}<button className="primary-button full-button" disabled={busy || (type === 'deposit' && methods.length === 0)}>{busy ? 'Submitting…' : type === 'transfer' ? 'Transfer funds' : 'Submit request'} <Icon name="chevron" size={16}/></button></form>{error && <p className="form-error">{error}</p>}{type === 'deposit' && !methods.length && <p className="form-error">No deposit methods are enabled. Contact the administrator.</p>}</div></div>
}

function SupportChat({ notify, adminMode = false, userId }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)
  const base = adminMode ? `/admin/support/${userId}/messages` : '/support/messages'
  async function refresh() {
    if (adminMode && !userId) return
    try {
      const result = await api(base)
      setMessages(result.messages || [])
      setError('')
    } catch (err) { setError(err.message) }
  }
  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 8000)
    return () => window.clearInterval(timer)
  }, [base])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages.length])
  async function send(event) {
    event.preventDefault()
    if (!draft.trim() || busy) return
    setBusy(true); setError('')
    try {
      await api(base, { method: 'POST', body: { body: draft } })
      setDraft('')
      await refresh()
      if (!adminMode) notify('Message sent to Arvo support')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  if (adminMode && !userId) return <EmptyState title="Choose a conversation" description="Select a member to view and reply to their support messages."/>
  return <>{!adminMode && <PageHeading eyebrow="ARVO SUPPORT" title="Live chat" subtitle="Send a message to the Arvo team and follow the conversation here."/>}<section className="chat-card"><div className="chat-header"><span className="support-icon"><Icon name="help" size={19}/></span><div><strong>{adminMode ? 'Member conversation' : 'Arvo live chat'}</strong><span>{adminMode ? 'Reply as administrator' : 'Messages refresh automatically while this screen is open.'}</span></div><span className="chat-live"><i/> Live</span></div><div className="chat-messages">{messages.length ? messages.map((message) => <div className={`chat-message ${message.senderRole === (adminMode ? 'admin' : 'user') ? 'message-self' : ''}`} key={message._id}><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleString()}</time></div>) : <div className="chat-empty"><Icon name="help" size={22}/><strong>Start a conversation</strong><span>Send a message and an Arvo administrator will reply here.</span></div>}<div ref={bottomRef}/></div><form className="chat-compose" onSubmit={send}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength="2000" placeholder="Write a message…" required/><button className="primary-button" disabled={busy || !draft.trim()}>{busy ? 'Sending…' : 'Send'}</button></form>{error && <p className="form-error">{error}</p>}</section></>
}

function AdminSupportPanel() {
  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  async function refresh() {
    try {
      const result = await api('/admin/support/conversations')
      setConversations(result.conversations || [])
      setSelected((current) => current || result.conversations?.[0]?.userId || '')
      setError('')
    } catch (err) { setError(err.message) }
  }
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 12000); return () => window.clearInterval(timer) }, [])
  return <div className="admin-chat-layout"><aside className="conversation-list"><span className="eyebrow">MEMBER MESSAGES</span>{conversations.length ? conversations.map((item) => <button key={item.userId} className={`conversation-item ${selected === item.userId ? 'selected' : ''}`} onClick={() => setSelected(item.userId)}><strong>{item.user?.name || 'Arvo member'}</strong><span>+91 {item.user?.mobile || '—'}</span><small>{item.latest?.body}</small>{item.unread > 0 && <i>{item.unread}</i>}</button>) : <p className="muted-line">No support messages yet.</p>}{error && <p className="form-error">{error}</p>}</aside><SupportChat key={selected || 'empty'} adminMode userId={selected}/></div>
}

const contentKinds = [
  ['news', 'News'], ['banner', 'Banner'], ['work_area', 'Work area'], ['about', 'About'], ['service', 'Services'], ['investor', 'Investors'], ['partner', 'Partners'], ['social', 'Socials'], ['menu', 'Menu'], ['logo', 'Logo'], ['icon', 'Icon'],
]

function ContentManager({ onChanged }) {
  const [type, setType] = useState('news')
  const [items, setItems] = useState([])
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function load() {
    try { const result = await api(`/admin/content?type=${type}`); setItems(result.items || []); setError('') } catch (err) { setError(err.message) }
  }
  useEffect(() => { load(); setForm(null) }, [type])
  function blank() { return { type, title: '', slug: '', body: '', imageUrl: '', language: 'en', sortOrder: 0, isPublished: false, metadata: { url: '' } } }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    const payload = { ...form, type, slug: form.slug || form.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
    try {
      await api(form._id ? `/admin/content/${form._id}` : '/admin/content', { method: form._id ? 'PATCH' : 'POST', body: payload })
      setForm(null); await load(); await onChanged()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function remove(item) {
    setBusy(true); setError('')
    try { await api(`/admin/content/${item._id}`, { method: 'DELETE' }); await load(); await onChanged() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="content-manager"><div className="content-manager-head"><div><span className="eyebrow">WEBSITE & NEWS CONTENT</span><h2>Content management</h2><p>Manage announcements, website sections, social links, navigation, logo and icon records.</p></div><button className="primary-button" onClick={() => setForm(blank())}><Icon name="plus" size={16}/> Add content</button></div><div className="content-type-tabs">{contentKinds.map(([key, label]) => <button key={key} className={type === key ? 'selected' : ''} onClick={() => setType(key)}>{label}</button>)}</div>{error && <p className="form-error admin-error">{error}</p>}{form && <form className="admin-form-card content-edit-form" onSubmit={save}><div className="content-form-heading"><div><span className="eyebrow">{form._id ? 'EDIT ITEM' : 'NEW ITEM'}</span><h3>{contentKinds.find(([key]) => key === type)?.[1]}</h3></div><button type="button" className="text-button" onClick={() => setForm(null)}>Cancel</button></div><label>Title<input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength="160"/></label><label>Slug<input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="Auto-generated from title"/></label><label>Text / details<textarea className="form-input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength="12000" rows="5"/></label><label>Image URL<input className="form-input" type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://"/></label><label>Link URL<input className="form-input" type="url" value={form.metadata?.url || ''} onChange={(e) => setForm({ ...form, metadata: { ...(form.metadata || {}), url: e.target.value } })} placeholder="https://"/></label><div className="form-pair"><label>Language code<input className="form-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value.toLowerCase() })} maxLength="12"/></label><label>Display order<input className="form-input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}/></label></div><label className="checkbox-row"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}/> Published</label><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save content'}</button></form>}<div className="admin-table-card content-list">{items.length ? items.map((item) => <div className="admin-list-row" key={item._id}><div><strong>{item.title}</strong><span>{item.language} · /{item.slug} · {item.isPublished ? 'Published' : 'Draft'}</span></div><button className="outline-button compact-button" onClick={() => setForm({ ...item, metadata: item.metadata || { url: '' } })}>Edit</button><button className="text-button" disabled={busy} onClick={() => remove(item)}>Delete</button></div>) : <EmptyState title={`No ${contentKinds.find(([key]) => key === type)?.[1].toLowerCase()} items`} description="Add a content item to publish it here."/>}</div></div>
}

function AdminPage({ notify, onRefresh }) {
  const tabs = ['Overview', 'Deposits', 'Withdrawals', 'Applications', 'Plans', 'Users', 'Content', 'Support', 'Settings', 'Ledger']
  const [tab, setTab] = useState('Overview')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [planForm, setPlanForm] = useState({ name: '', slug: '', category: 'Investment plan', summary: '', details: '', minimum: '', termMonths: 12, riskLabel: 'See plan documents', termsUrl: '', isActive: true })
  const [methodForm, setMethodForm] = useState({ key: '', label: '', instructions: '', active: true })
  const [settings, setSettings] = useState(null)
  const [integrations, setIntegrations] = useState(null)
  const [languagesText, setLanguagesText] = useState('en')
  const [search, setSearch] = useState('')

  async function load(nextTab = tab) {
    setBusy(true); setError('')
    try {
      const routes = { Overview: '/admin/overview', Deposits: '/admin/deposits', Withdrawals: '/admin/withdrawals', Applications: '/admin/applications', Plans: '/admin/plans', Users: `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, Settings: '/admin/settings', Ledger: '/admin/ledger' }
      const result = await api(routes[nextTab])
      setData(result)
      if (nextTab === 'Settings') { setSettings(result.settings); setIntegrations(result.integrations || {}); setLanguagesText((result.settings.languages || ['en']).join(', ')) }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  useEffect(() => { if (!['Content', 'Support'].includes(tab)) load(tab) }, [tab])
  async function mutate(path, method, body, success) {
    setBusy(true); setError('')
    try { await api(path, { method, body }); notify(success); await load(tab); await onRefresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function addPlan(event) {
    event.preventDefault()
    const slug = planForm.slug || planForm.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await mutate('/admin/plans', 'POST', { ...planForm, slug, minimum: planForm.minimum, termMonths: Number(planForm.termMonths) }, 'Plan published')
    setPlanForm({ name: '', slug: '', category: 'Investment plan', summary: '', details: '', minimum: '', termMonths: 12, riskLabel: 'See plan documents', termsUrl: '', isActive: true })
  }
  function addPaymentMethod() {
    if (!methodForm.key || !methodForm.label || !methodForm.instructions) return setError('Complete all payment method fields.')
    setSettings((current) => ({ ...current, paymentMethods: [...(current.paymentMethods || []), methodForm] }))
    setMethodForm({ key: '', label: '', instructions: '', active: true }); setError('')
  }
  async function saveSettings() {
    if (!settings) return
    const languages = [...new Set(languagesText.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))]
    await mutate('/admin/settings', 'PUT', { paymentMethods: settings.paymentMethods || [], languages, themeIds: settings.themeIds || themes.map((item) => item.id) }, 'Platform settings saved')
  }

  const titleForTab = { Overview: 'Administration', Deposits: 'Deposit management', Withdrawals: 'Withdrawal management', Applications: 'Plan applications', Plans: 'Plan management', Users: 'Users management', Content: 'News & web management', Support: 'Live chat support', Settings: 'Platform settings', Ledger: 'Transaction log' }
  return <><PageHeading eyebrow="ARVO CONTROL CENTRE" title={titleForTab[tab]} subtitle="Review account activity and manage published platform data."/><div className="admin-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>{busy && <div className="inline-loading">Loading…</div>}{error && <p className="form-error admin-error">{error}</p>}
    {tab === 'Overview' && data?.overview && <><div className="admin-stat-grid">{[['Users',data.overview.users],['Active users',data.overview.activeUsers],['Published plans',data.overview.plans],['Pending deposits',data.overview.pendingDeposits],['Pending withdrawals',data.overview.pendingWithdrawals],['Plan applications',data.overview.pendingApplications]].map(([label,value]) => <div className="admin-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="section-block"><div className="section-heading"><div><span className="eyebrow">LATEST LEDGER ENTRIES</span><h2>Recent account activity</h2></div><button className="inline-link" onClick={() => setTab('Ledger')}>Open log <Icon name="chevron" size={15}/></button></div><LedgerTable entries={data.overview.recentEntries || []}/></section></>}
    {tab === 'Deposits' && <RequestTable items={data?.deposits || []} type="deposit" onDecision={(item, decision) => mutate(`/admin/deposits/${item._id}/review`, 'PATCH', { decision }, `Deposit ${decision}ed`)}/>}
    {tab === 'Withdrawals' && <RequestTable items={data?.withdrawals || []} type="withdrawal" onDecision={(item, decision) => mutate(`/admin/withdrawals/${item._id}/review`, 'PATCH', { decision }, `Withdrawal ${decision}`)}/>}
    {tab === 'Applications' && <RequestTable items={data?.applications || []} type="application" onDecision={(item, decision) => mutate(`/admin/applications/${item._id}/review`, 'PATCH', { decision }, `Application ${decision}ed`)}/>}
    {tab === 'Plans' && <div className="admin-columns"><form className="admin-form-card" onSubmit={addPlan}><span className="eyebrow">PUBLISH A PLAN</span><h3>New investment plan</h3><label>Plan name<input className="form-input" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required/></label><label>Slug<input className="form-input" value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} placeholder="Auto-generated from name"/></label><label>Category<input className="form-input" value={planForm.category} onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}/></label><label>Short summary<textarea className="form-input" value={planForm.summary} onChange={(e) => setPlanForm({ ...planForm, summary: e.target.value })} maxLength="500"/></label><label>Plan details<textarea className="form-input" value={planForm.details} onChange={(e) => setPlanForm({ ...planForm, details: e.target.value })}/></label><div className="form-pair"><label>Minimum amount (₹)<input className="form-input" value={planForm.minimum} onChange={(e) => setPlanForm({ ...planForm, minimum: e.target.value })} required inputMode="decimal"/></label><label>Term (months)<input className="form-input" type="number" min="1" max="600" value={planForm.termMonths} onChange={(e) => setPlanForm({ ...planForm, termMonths: e.target.value })} required/></label></div><label>Risk label<input className="form-input" value={planForm.riskLabel} onChange={(e) => setPlanForm({ ...planForm, riskLabel: e.target.value })}/></label><label>Terms URL<input className="form-input" type="url" value={planForm.termsUrl} onChange={(e) => setPlanForm({ ...planForm, termsUrl: e.target.value })} placeholder="https://"/></label><button className="primary-button" disabled={busy}>Publish plan</button></form><div className="admin-table-card"><span className="eyebrow">CURRENT PLANS</span>{(data?.plans || []).map((plan) => <div className="admin-list-row" key={plan._id}><div><strong>{plan.name}</strong><span>{formatINR(plan.minimumPaise, true)} · {plan.termMonths} months · {plan.isActive ? 'Active' : 'Hidden'}</span></div><button className="outline-button compact-button" onClick={() => mutate(`/admin/plans/${plan._id}`, 'PATCH', { ...plan, minimum: plan.minimum, isActive: !plan.isActive }, plan.isActive ? 'Plan hidden' : 'Plan published')}>{plan.isActive ? 'Hide' : 'Publish'}</button></div>)}</div></div>}
    {tab === 'Users' && <><form className="admin-search" onSubmit={(e) => { e.preventDefault(); load('Users') }}><input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mobile or name"/><button className="outline-button">Search</button></form><div className="admin-table-card">{(data?.users || []).map((item) => <div className="admin-user-row" key={item.id}><div><strong>{item.name || 'New member'}</strong><span>+91 {item.mobile} · {item.email || 'No email'}</span></div><StatusPill status={item.profileStatus}/><button className="outline-button compact-button" onClick={() => mutate(`/admin/users/${item.id}`, 'PATCH', { profileStatus: item.profileStatus === 'verified' ? 'pending' : 'verified' }, item.profileStatus === 'verified' ? 'Verification reset' : 'Profile verified')}>{item.profileStatus === 'verified' ? 'Reset verification' : 'Verify profile'}</button><button className="outline-button compact-button" onClick={() => mutate(`/admin/users/${item.id}`, 'PATCH', { status: item.status === 'active' ? 'blocked' : 'active' }, item.status === 'active' ? 'User blocked' : 'User activated')}>{item.status === 'active' ? 'Block' : 'Activate'}</button></div>)}</div></>}
    {tab === 'Settings' && settings && <div className="admin-settings-grid"><section className="admin-form-card"><span className="eyebrow">DEPOSIT METHODS</span><h3>Payment instructions</h3><p>These instructions appear to users. Requests stay pending until an administrator verifies the payment outside Arvo.</p>{(settings.paymentMethods || []).map((method, index) => <div className="method-edit-row" key={`${method.key}-${index}`}><label>Label<input className="form-input" value={method.label} onChange={(e) => setSettings({ ...settings, paymentMethods: settings.paymentMethods.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })}/></label><label>Instructions<textarea className="form-input" value={method.instructions} onChange={(e) => setSettings({ ...settings, paymentMethods: settings.paymentMethods.map((item, i) => i === index ? { ...item, instructions: e.target.value } : item) })}/></label><label className="checkbox-row"><input type="checkbox" checked={method.active} onChange={(e) => setSettings({ ...settings, paymentMethods: settings.paymentMethods.map((item, i) => i === index ? { ...item, active: e.target.checked } : item) })}/> Active</label><button className="text-button" onClick={() => setSettings({ ...settings, paymentMethods: settings.paymentMethods.filter((_, i) => i !== index) })}>Remove</button></div>)}<div className="method-add-form"><label>Key<input className="form-input" value={methodForm.key} onChange={(e) => setMethodForm({ ...methodForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="upi-main"/></label><label>Display label<input className="form-input" value={methodForm.label} onChange={(e) => setMethodForm({ ...methodForm, label: e.target.value })} placeholder="UPI transfer"/></label><label>Payment instructions<textarea className="form-input" value={methodForm.instructions} onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })} placeholder="Add the payment details users should see"/></label><button className="outline-button" type="button" onClick={addPaymentMethod}><Icon name="plus" size={15}/> Add method</button></div><button className="primary-button" onClick={saveSettings} disabled={busy}>Save platform settings</button></section><section className="admin-form-card"><span className="eyebrow">APP THEMES</span><h3>Available themes</h3><p>All five premium themes are available to users.</p><div className="theme-admin-list">{themes.map((item) => <span key={item.id}><i style={{ background: item.colors[0] }}/>{item.name}</span>)}</div><span className="eyebrow settings-note">EMAIL SETTINGS</span><p className={integrations?.emailConfigured ? 'integration-state integration-ready' : 'integration-state'}>{integrations?.emailConfigured ? 'SMTP is configured. Email verification messages can be sent.' : 'SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASSWORD to the API environment to enable verification email.'}</p><span className="eyebrow settings-note">LANGUAGE CODES</span><label>Enabled content languages<input className="form-input" value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} placeholder="en, hi"/></label><p>Use ISO language codes for content records. Add translated content for each code before publishing it.</p><button className="primary-button" onClick={saveSettings} disabled={busy}>Save platform settings</button></section></div>}
    {tab === 'Content' && <ContentManager onChanged={onRefresh}/>}
    {tab === 'Support' && <AdminSupportPanel/>}
    {tab === 'Ledger' && <LedgerTable entries={data?.entries || []}/>}
  </>
}

function RequestTable({ items, type, onDecision }) {
  if (!items.length) return <EmptyState title={`No ${type} requests`} description="New requests will appear here for administrator review."/>
  return <div className="admin-table-card">{items.map((item) => <div className="admin-request-row" key={item._id}><div className="request-user"><strong>{item.userId?.name || 'Arvo member'}</strong><span>+91 {item.userId?.mobile || '—'} · {new Date(item.createdAt).toLocaleString()}</span>{type === 'deposit' && <span>Method: {item.methodKey} · Ref: {item.paymentReference}</span>}{type === 'application' && <span>Plan: {item.planId?.name || 'Plan'}</span>}</div><strong>{formatINR(item.amountPaise, true)}</strong><StatusPill status={item.status}/><div className="request-actions">{type === 'withdrawal' && item.status === 'approved' && <button className="primary-button compact-button" onClick={() => onDecision(item, 'paid')}>Mark paid</button>}{item.status === 'pending' && <><button className="primary-button compact-button" onClick={() => onDecision(item, type === 'withdrawal' ? 'approve' : 'accept')}>{type === 'withdrawal' ? 'Approve' : 'Accept'}</button><button className="outline-button compact-button" onClick={() => onDecision(item, 'reject')}>Reject</button></>}</div></div>)}</div>
}

function LedgerTable({ entries }) {
  if (!entries.length) return <EmptyState title="No ledger entries yet" description="Posted wallet activity will be listed here."/>
  return <div className="admin-table-card ledger-table">{entries.map((entry) => <div className="admin-list-row" key={entry._id}><div><strong>{entry.description || entry.kind}</strong><span>{entry.userId?.name || 'Member'} · {entry.userId?.mobile || ''} · {new Date(entry.createdAt).toLocaleString()}</span></div><strong className={entry.direction === 'credit' ? 'ledger-credit' : ''}>{entry.direction === 'credit' ? '+' : '−'} {formatINR(entry.amountPaise, true)}</strong><StatusPill status={entry.status}/></div>)}</div>
}

export default App
