import { useEffect, useRef, useState } from 'react'
import { api, formatUSDT } from './lib/api.js'

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
  logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9 1-1.9 1.2-1.9 2.9M12 17h.01"/></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></>,
}

function Icon({ name, size = 20, strokeWidth = 1.7 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] || iconPaths.spark}</svg>
}

function pageFromLocation() {
  return ({ login: 'Login', register: 'Register', 'password-reset': 'PasswordReset' }[new URLSearchParams(window.location.search).get('page')] || 'Home')
}

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState(pageFromLocation)
  // The administrator publishes one theme for everyone; clients only read it.
  const [theme, setTheme] = useState('emerald')
  const [plans, setPlans] = useState([])
  const [settings, setSettings] = useState({ paymentMethods: [], languages: ['en'], themes: themes.map((item) => item.id), activeTheme: 'emerald' })
  const [wallet, setWallet] = useState(null)
  const [referrals, setReferrals] = useState(null)
  const [news, setNews] = useState([])
  const [brandLogo, setBrandLogo] = useState('')
  const [brandIcon, setBrandIcon] = useState('')
  const [activePlan, setActivePlan] = useState(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
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
    if (settingData.status === 'fulfilled') {
      setSettings(settingData.value)
      setTheme(settingData.value.activeTheme || 'emerald')
    }
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
  useEffect(() => {
    const onPopState = () => {
      setPage(pageFromLocation())
      setActivePlan(null)
      setAccountMenuOpen(false)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  // Keep an already-open app in sync when the administrator publishes a theme.
  useEffect(() => {
    let alive = true
    const refreshTheme = () => {
      if (document.visibilityState === 'hidden') return
      api('/settings').then((result) => {
        if (!alive) return
        setSettings(result)
        setTheme(result.activeTheme || 'emerald')
      }).catch(() => {}) // Keep the last known live theme if temporarily offline.
    }
    const timer = window.setInterval(refreshTheme, 60000)
    document.addEventListener('visibilitychange', refreshTheme)
    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshTheme)
    }
  }, [])
  useEffect(() => {
    if (!accountMenuOpen) return undefined
    const closeOnOutside = (event) => { if (event.target instanceof Element && !event.target.closest('.account-menu-wrap')) setAccountMenuOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setAccountMenuOpen(false) }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [accountMenuOpen])
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
  const navigate = (nextPage) => {
    const routeKeys = { Login: 'login', Register: 'register', PasswordReset: 'password-reset' }
    const params = new URLSearchParams(window.location.search)
    if (routeKeys[nextPage]) params.set('page', routeKeys[nextPage])
    else if (params.has('page')) { params.delete('page'); params.delete('ref') }
    const query = params.toString()
    const nextUrl = window.location.pathname + (query ? '?' + query : '')
    if (window.location.pathname + window.location.search !== nextUrl) window.history.pushState({}, '', nextUrl)
    setPage(nextPage); setActivePlan(null); setAccountMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openAccountItem = (item) => {
    setAccountMenuOpen(false)
    if (item === 'kyc') {
      navigate('Profile')
      window.setTimeout(() => document.getElementById('kyc-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    } else navigate(item === 'settings' ? 'Settings' : 'Profile')
  }
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* Local session still clears. */ }
    setAccountMenuOpen(false); setUser(null); setWallet(null); setReferrals(null); setPage('Home'); notify('Signed out')
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

  async function sendMpinOtp() {
    return api('/profile/mpin/otp', { method: 'POST', body: {} })
  }

  async function saveMpin(form) {
    const result = await api('/profile/mpin', { method: 'POST', body: form })
    setUser(result.user)
    notify(result.message || 'Withdrawal MPIN saved securely')
  }

  const navItems = [['Home','home'],['Plans','layers'],['Wallet','wallet'],['Referrals','users'],['Profile','user']]
  if (user?.role === 'admin') navItems.push(['Admin','shield'])
  const currentTheme = themes.find((item) => item.id === theme) || themes[0]

  return <div className="app-shell" data-theme={theme} data-view={page === 'Admin' ? 'admin' : 'mobile'}>
    <header className="topbar">
      <button className="brand" onClick={() => navigate('Home')} aria-label="Arvo home">{brandLogo ? <img className="brand-image" src={brandLogo} alt="Arvo"/> : <><span className="brand-mark">A</span><span className="brand-word">arvo<span>.</span></span></>}</button>
      <div className="topbar-right">
        <div className="live-theme-chip" title={`Live visual identity: ${currentTheme.name}`}><span className="live-theme-gem" style={{ background: currentTheme.colors[0] }}/><span className="live-theme-label">{currentTheme.name}</span></div>
        {user ? <><button className="icon-button notification-button" aria-label="Support chat" onClick={() => navigate('Support')}><Icon name="bell"/><i/></button><div className="account-menu-wrap">
          <button className="avatar-button" onClick={() => setAccountMenuOpen((open) => !open)} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={accountMenuOpen}>{initials(user.name)}</button>
          {accountMenuOpen && <div className="account-menu" role="menu" aria-label="Account menu">
            <div className="account-menu-heading"><span className="account-menu-avatar">{initials(user.name)}</span><span><strong>{user.name || 'Arvo member'}</strong><small>+91 {user.mobile}</small></span></div>
            <button className="account-menu-item" role="menuitem" onClick={() => openAccountItem('profile')}><Icon name="user" size={18}/>Profile</button>
            <button className="account-menu-item" role="menuitem" onClick={() => openAccountItem('kyc')}><Icon name="shield" size={18}/>KYC &amp; verification</button>
            <button className="account-menu-item" role="menuitem" onClick={() => openAccountItem('settings')}><Icon name="sun" size={18}/>Settings</button>
            <div className="account-menu-separator"/>
            <button className="account-menu-item account-menu-logout" role="menuitem" onClick={() => { setAccountMenuOpen(false); logout() }}><Icon name="logout" size={18}/>Log out</button>
          </div>}
        </div></> : <button className="secondary-button top-signin" onClick={() => navigate('Login')}>Sign in</button>}
      </div>
    </header>

    <main className="main-content">
      {loading ? <div className="loading-state"><span className="loading-mark">A</span><span>Preparing your Arvo experience…</span></div> : !user ? <>
        {['Login', 'Register', 'PasswordReset'].includes(page) ? <AuthPage mode={page} onNavigate={navigate} onSignedIn={(nextUser) => { setUser(nextUser); navigate('Home') }} notify={notify}/> : <>
          {page === 'Plans' && !activePlan && <PlansPage plans={plans} onOpenPlan={openPlan}/>}
          {page !== 'Plans' && <SignedOutPage plans={plans} onSignIn={() => navigate('Login')} onSignUp={() => navigate('Register')} onBrowse={() => navigate('Plans')} onOpenPlan={openPlan}/>}
          {activePlan && <PlanDetail plan={activePlan} onBack={() => setActivePlan(null)} signedOut onSignIn={() => navigate('Login')}/>}
        </>}
      </> : <>
        {page === 'Home' && !activePlan && <HomePage user={user} wallet={wallet} referrals={referrals} plans={plans} news={news} onOpenPlan={openPlan} setPage={navigate} notify={notify}/>}
        {page === 'Plans' && !activePlan && <PlansPage plans={plans} onOpenPlan={openPlan}/>}
        {page === 'Plans' && activePlan && <PlanDetail plan={activePlan} onBack={() => setActivePlan(null)} onApply={submitPlan}/>}
        {page === 'Wallet' && <WalletPage wallet={wallet} onAction={setAction} notify={notify}/>}
        {page === 'Referrals' && <ReferralPage referrals={referrals} notify={notify}/>}
        {page === 'Profile' && <ProfilePage user={user} theme={theme} onSave={saveProfile} onVerify={verifyProfile} onSendEmail={sendEmailVerification} onSendMpinOtp={sendMpinOtp} onSaveMpin={saveMpin} onSupport={() => navigate('Support')} onAdmin={() => navigate('Admin')} onLogout={logout} notify={notify}/>}
        {page === 'Settings' && <SettingsPage theme={theme}/>}
        {page === 'Support' && <SupportChat notify={notify}/>}
        {page === 'Admin' && user.role === 'admin' && <AdminPage notify={notify} onRefresh={async () => { await loadPublicData(); await loadAccountData() }}/>}
      </>}
    </main>

    {user && <nav className="bottom-nav" aria-label="Main navigation">{navItems.map(([label, icon]) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => navigate(label)}><Icon name={icon} size={20}/><span>{label}</span></button>)}</nav>}

    {action && <WalletActionModal type={action} user={user} methods={settings.paymentMethods || []} onClose={() => setAction(null)} onSubmit={submitWalletAction} notify={notify}/>}
    {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={14}/></span>{toast}</div>}
  </div>
}

function initials(name = '') { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A' }
function cycleLabel(value = 'monthly') { return value === 'one_time' ? 'One time' : value.charAt(0).toUpperCase() + value.slice(1) }
function durationLabel(days = 30) { const value = Number(days) || 30; return value % 365 === 0 ? `${value / 365} year${value === 365 ? '' : 's'}` : value % 30 === 0 ? `${value / 30} month${value === 30 ? '' : 's'}` : `${value} day${value === 1 ? '' : 's'}` }
function newRequestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }
function EmptyState({ title, description, action }) { return <div className="empty-state"><span className="empty-icon"><Icon name="layers" size={22}/></span><h3>{title}</h3><p>{description}</p>{action}</div> }
function StatusPill({ status }) { const label = status?.replaceAll('_', ' ') || 'pending'; return <span className={`status-pill state-${label.replaceAll(' ', '-')}`}>{label}</span> }

function SignedOutPage({ plans, onSignIn, onSignUp, onBrowse, onOpenPlan }) {
  return <div className="signed-out-page"><section className="signed-out-copy"><span className="eyebrow">WEALTH, THOUGHTFULLY</span><h1>A clearer view of your financial journey<span className="greeting-dot">.</span></h1><p>Explore available plans, manage requests and keep your account details in one considered place.</p><div className="signed-out-actions"><button className="primary-button" onClick={onSignUp}>Create your Arvo account <Icon name="chevron" size={17}/></button><button className="text-button" onClick={onBrowse}>Explore plans</button><button className="text-button" onClick={onSignIn}>Already a member? Sign in</button></div><div className="trust-note"><Icon name="lock" size={16}/> Secure access with mobile verification</div></section><aside className="signed-out-panel"><div className="signed-panel-top"><span className="brand-mark">A</span><span className="eyebrow">ARVO ACCOUNT</span></div><div className="signed-panel-orbit"><span/><span/><strong>A</strong></div><div className="signed-panel-foot"><span>Personal dashboard</span><span>Plans · Wallet · Referrals</span></div></aside><section className="public-plans-preview"><div className="section-heading"><div><span className="eyebrow">EXPLORE ARVO</span><h2>Available investment plans</h2></div><button className="inline-link" onClick={onBrowse}>View plans <Icon name="chevron" size={15}/></button></div>{plans.length ? <div className="plan-grid home-plans">{plans.slice(0, 2).map((plan, index) => <PlanCard plan={plan} index={index} key={plan.id} onOpen={onOpenPlan}/>)}</div> : <p className="muted-line">Plans will appear here when published by the administrator.</p>}</section></div>
}

async function compressPlanImage(file) {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!supportedTypes.includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.')
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.')
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)
  try {
    const dimensions = await new Promise((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('This image could not be opened. Try another file.'))
      image.src = objectUrl
    })
    const scale = Math.min(1, 1200 / Math.max(dimensions.width, dimensions.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(dimensions.width * scale))
    canvas.height = Math.max(1, Math.round(dimensions.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this image.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (let quality = 0.86; quality >= 0.5; quality -= 0.06) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      if (dataUrl.length <= 600000) return dataUrl
    }
    throw new Error('This image is still too large after compression. Try a smaller image.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function PlanCard({ plan, onOpen, compact = false, index = 0 }) {
  const tint = ['gold', 'green', 'blue'][index % 3]
  return <button className={`plan-card ${compact ? 'plan-card-compact' : ''}`} onClick={() => onOpen(plan)}>
    <div className={`plan-art ${tint} ${plan.imageUrl ? 'has-image' : ''}`}>{plan.imageUrl && <img className="plan-art-image" src={plan.imageUrl} alt="" loading="lazy"/>}<span className="plan-symbol"><Icon name={['sun','spark','shield'][index % 3]} size={26}/></span><span className="plan-art-label">ARVO · PLAN PROFILE</span><span className="plan-orbit orbit-one"/><span className="plan-orbit orbit-two"/></div>
    <div className="plan-card-body"><span className="eyebrow">{plan.category || 'INVESTMENT PLAN'}</span><div className="plan-title-row"><h3>{plan.name}</h3><Icon name="chevron" size={17}/></div><p>{plan.summary || 'Open this plan profile to review its published details and terms.'}</p><div className="plan-meta"><span>Price <b>{formatUSDT(plan.pricePaise, true)}</b></span><span>Cycle <b>{cycleLabel(plan.cycle)}</b></span><span>Duration <b>{durationLabel(plan.durationDays)}</b></span><span>ROI <b>{Number(plan.investmentRoiPct || 0)}%</b></span><span>Profit return <b>{formatUSDT(plan.profitReturnPaise, true)}</b></span></div></div>
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
    <section className="hero-grid"><div className="balance-card"><div className="balance-card-top"><span className="balance-label"><span className="live-dot"/> ACCOUNT VALUE</span><Icon name="spark" size={17}/></div><div className="balance-value">{formatUSDT(total / 100)}</div><div className="balance-change"><span>Available balance + active plan value + reserved requests</span></div><div className="balance-footer"><div><span>Invested</span><strong>{formatUSDT(invested, true)}</strong></div><div><span>Available</span><strong>{formatUSDT(available, true)}</strong></div><button className="balance-arrow" onClick={() => setPage('Wallet')} aria-label="View wallet"><Icon name="chevron" size={20}/></button></div><div className="hero-line" aria-hidden="true"><svg viewBox="0 0 560 110" preserveAspectRatio="none"><path d="M0 93 C38 83 42 58 76 66 S119 87 153 65 198 41 229 58 275 75 305 48 352 39 382 47 426 26 460 38 503 14 560 9" fill="none" stroke="currentColor" strokeWidth="2"/></svg></div></div><div className="side-cards"><div className="small-stat-card"><div className="stat-card-top"><span className="stat-icon"><Icon name="wallet" size={18}/></span><span className="eyebrow">RESERVED</span></div><strong>{formatUSDT(reserved, true)}</strong><span className="stat-caption">Withdrawal requests under review</span></div><div className="small-stat-card second-stat"><div className="stat-card-top"><span className="stat-icon lavender"><Icon name="layers" size={18}/></span><span className="eyebrow">ACTIVE PLANS</span></div><strong>{wallet?.positions?.length || 0}</strong><button className="inline-link" onClick={() => setPage('Plans')}>View plans <Icon name="chevron" size={14}/></button></div></div></section>
    <section className="quick-actions" aria-label="Quick actions">
      <button className="quick-action" onClick={() => setPage('Wallet')}><span className="quick-action-icon"><Icon name="wallet" size={19}/></span><span>Wallet</span></button>
      <button className="quick-action" onClick={() => setPage('Plans')}><span className="quick-action-icon"><Icon name="layers" size={19}/></span><span>Explore plans</span></button>
      <button className="quick-action" onClick={() => setPage('Referrals')}><span className="quick-action-icon"><Icon name="users" size={19}/></span><span>Referrals</span></button>
      <button className="quick-action" onClick={() => setPage('Support')}><span className="quick-action-icon"><Icon name="help" size={19}/></span><span>Support</span></button>
    </section>
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
  const [requestKey, setRequestKey] = useState(newRequestKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (signedOut) return onSignIn()
    setBusy(true); setError('')
    try { await onApply(plan, plan.price, requestKey); setRequestKey(newRequestKey()) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <><button className="back-link" onClick={onBack}>← <span>All investment plans</span></button><div className="detail-grid"><div><div className={`detail-art plan-art green ${plan.imageUrl ? 'has-image' : ''}`}>{plan.imageUrl && <img className="plan-art-image" src={plan.imageUrl} alt="" fetchPriority="high"/>}<span className="plan-symbol"><Icon name="spark" size={34}/></span><span className="plan-art-label">ARVO · PLAN PROFILE</span><span className="plan-orbit orbit-one"/><span className="plan-orbit orbit-two"/></div><div className="detail-overview"><span className="eyebrow">{plan.category || 'INVESTMENT PLAN'}</span><h1>{plan.name}</h1><p>{plan.summary}</p></div><div className="detail-panel"><span className="eyebrow">PLAN OVERVIEW</span><h2>Published information</h2><p>{plan.details || 'The administrator has not added further plan information.'}</p><div className="detail-facts"><div><span>Fixed price</span><strong>{formatUSDT(plan.pricePaise, true)}</strong></div><div><span>Investment cycle</span><strong>{cycleLabel(plan.cycle)}</strong></div><div><span>Duration</span><strong>{durationLabel(plan.durationDays)}</strong></div><div><span>Investment ROI</span><strong>{Number(plan.investmentRoiPct || 0)}%</strong></div><div><span>Profit return</span><strong>{formatUSDT(plan.profitReturnPaise, true)}</strong></div><div><span>Risk information</span><strong>{plan.riskLabel || 'See plan documents'}</strong></div><div><span>Terms document</span><strong>{plan.termsUrl ? <a href={plan.termsUrl} target="_blank" rel="noreferrer">Open terms</a> : 'Not supplied'}</strong></div></div></div></div><aside className="detail-aside"><span className="eyebrow">APPLICATION</span><h3>Request this plan.</h3><p>Submitting an application does not move funds. The administrator reviews it first.</p><div className="aside-divider"/><div className="aside-row"><span>Fixed price</span><strong>{formatUSDT(plan.pricePaise, true)}</strong></div><div className="aside-row"><span>Cycle · duration</span><strong>{cycleLabel(plan.cycle)} · {durationLabel(plan.durationDays)}</strong></div><div className="aside-row"><span>ROI · profit return</span><strong>{Number(plan.investmentRoiPct || 0)}% · {formatUSDT(plan.profitReturnPaise, true)}</strong></div><form onSubmit={submit}><label className="field-label" htmlFor="apply-amount">Fixed plan price (USDT)</label><input className="form-input" id="apply-amount" value={plan.price} readOnly inputMode="decimal" required/><button className="primary-button full-button apply-button" disabled={busy}>{busy ? 'Submitting…' : signedOut ? 'Sign in to continue' : 'Submit application'} <Icon name="chevron" size={16}/></button></form>{error && <p className="form-error">{error}</p>}<span className="small-legal">Published plan figures are administrator-set terms and are not automatically credited.</span></aside></div></>
}

function WalletPage({ wallet, onAction, notify }) {
  const account = wallet?.wallet || { availablePaise: 0, investedPaise: 0, reservedPaise: 0 }
  const deposits = wallet?.deposits || []
  const withdrawals = wallet?.withdrawals || []
  return <><PageHeading eyebrow="YOUR MONEY, IN ONE PLACE" title="Wallet" subtitle="Track approved credits, transfer requests and wallet activity." action={<button className="secondary-button" onClick={() => onAction('deposit')}>+ Add funds</button>}/><section className="wallet-overview"><div className="wallet-main-balance"><span className="eyebrow">AVAILABLE BALANCE</span><strong>{formatUSDT(account.availablePaise, true)}</strong><p>Only approved credits appear as available balance.</p><div className="wallet-actions"><button className="primary-button" onClick={() => onAction('deposit')}><Icon name="arrowDown" size={17}/> Deposit request</button><button className="outline-button" onClick={() => onAction('transfer')}><Icon name="swap" size={17}/> Transfer</button><button className="outline-button" onClick={() => onAction('withdrawal')}><Icon name="arrowUp" size={17}/> Withdraw</button></div></div><div className="wallet-mini"><div><span className="eyebrow">INVESTED</span><strong>{formatUSDT(account.investedPaise, true)}</strong></div><div><span className="eyebrow">RESERVED FOR WITHDRAWALS</span><strong className="accent-text">{formatUSDT(account.reservedPaise, true)}</strong></div></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">ACCOUNT HISTORY</span><h2>Transactions</h2></div></div>{wallet?.transactions?.length ? <TransactionList items={wallet.transactions}/> : <EmptyState title="No transactions yet" description="Approved deposits, transfers and plan applications will be listed here."/>}</section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">REQUEST TRACKING</span><h2>Deposits and withdrawals</h2></div></div><div className="request-list">{[...deposits.map((item) => ({ ...item, type: 'Deposit' })), ...withdrawals.map((item) => ({ ...item, type: 'Withdrawal' }))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((item) => <div className="request-row" key={`${item.type}-${item._id}`}><div><strong>{item.type} · {formatUSDT(item.amountPaise, true)}</strong><span>{new Date(item.createdAt).toLocaleString()}</span></div><StatusPill status={item.status}/></div>)}</div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">INVESTMENT TRACKING</span><h2>Plan applications</h2></div></div>{wallet?.planApplications?.length ? <div className="request-list">{wallet.planApplications.map((item) => <div className="request-row" key={item._id}><div><strong>{item.planName} · {formatUSDT(item.amountPaise, true)}</strong><span>Submitted {new Date(item.createdAt).toLocaleString()}</span></div><StatusPill status={item.status}/></div>)}</div> : <EmptyState title="No plan applications yet" description="Requests and administrator decisions will be shown here."/>}</section><div className="demo-note"><span className="demo-mark">i</span><span>Deposits are credited only after an administrator confirms the external payment reference. Withdrawal payout is manually handled after review.</span></div></>
}

function TransactionList({ items }) {
  return <div className="transaction-list">{items.map((item, index) => {
    const credit = item.direction === 'credit'
    const title = item.description || item.kind?.replaceAll('_', ' ') || 'Wallet transaction'
    return <div className="transaction-row" key={item._id || index}><span className={`transaction-icon ${credit ? 'positive' : 'neutral'}`}><Icon name={credit ? 'arrowDown' : 'chart'} size={18}/></span><div className="transaction-description"><strong>{title}</strong><span>{new Date(item.createdAt).toLocaleString()} · {item.status || 'posted'}</span></div><strong className={`transaction-amount ${credit ? 'positive' : 'neutral'}`}>{credit ? '+' : '−'} {formatUSDT(item.amountPaise, true)}</strong></div>
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

function SettingsPage({ theme }) {
  const current = themes.find((item) => item.id === theme) || themes[0]
  return <>
    <PageHeading eyebrow="YOUR ARVO EXPERIENCE" title="Settings" subtitle="Your app uses the visual identity selected by the Arvo administrator."/>
    <section className="settings-panel live-appearance-panel">
      <div className="settings-panel-heading"><span className="eyebrow">CURRENT LIVE THEME</span><h2>{current.name}</h2><p>The same premium theme is published to all Arvo users.</p></div>
      <div className="live-appearance-swatches">{current.colors.map((color) => <span key={color} style={{ background: color }}/>)}</div>
      <p className="live-appearance-help"><Icon name="shield" size={17}/> Appearance changes are managed by the administrator to keep the experience consistent.</p>
    </section>
  </>
}

function ThemeStudio({ activeTheme, draftTheme, onSelect, onPublish, busy }) {
  const selected = themes.find((item) => item.id === draftTheme) || themes[0]
  const live = themes.find((item) => item.id === activeTheme) || themes[0]
  return <section className="theme-studio">
    <div className="studio-intro">
      <div><span className="eyebrow">GLOBAL VISUAL IDENTITY</span><h2>Choose the experience everyone sees.</h2><p>Explore all five premium mobile themes. Selecting a preview does not change the live app until you publish it.</p></div>
      <span className="studio-live-status"><i/> Live now: {live.name}</span>
    </div>
    <div className="studio-grid">
      {themes.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)} aria-pressed={draftTheme === item.id} className={`studio-theme-card ${draftTheme === item.id ? 'is-selected' : ''}`} >
        <span className="studio-mini-phone" data-preview-theme={item.id}>
          <span className="studio-phone-top"><span>9:41</span><span>●●●</span></span>
          <span className="studio-phone-brand"><span className="studio-phone-logo">A</span> arvo.</span>
          <span className="studio-phone-greeting">Welcome back</span>
          <span className="studio-phone-balance"><small>Your portfolio</small><strong>USDT 125,430.00</strong><em>PORTFOLIO OVERVIEW</em><span className="studio-phone-chart"/></span>
          <span className="studio-phone-tiles"><i/><i/><i/></span>
          <span className="studio-phone-bottom"><i/><i/><i/><i/></span>
        </span>
        <span className="studio-theme-details">
          <strong>{item.name}</strong>
          <small>{{
            emerald:'Deep emerald with luminous gold and refined contrast',
            obsidian:'Statement charcoal surfaces with rich gold',
            ivory:'Warm ivory, champagne accents and elegant spacing',
            sapphire:'Midnight navy with electric blue details',
            burgundy:'Burgundy and rose-gold with soft sophistication',
          }[item.id]}</small>
          <span className="studio-palette">{item.colors.map((color) => <i key={color} style={{ background: color }}/>)}</span>
          <span className="studio-theme-state">{item.id === activeTheme ? '● Live theme' : draftTheme === item.id ? 'Selected to preview' : 'Preview this theme'}{draftTheme === item.id && <Icon name="check" size={15}/>}</span>
        </span>
      </button>)}
    </div>
    <div className="studio-publish-bar"><div><span className="eyebrow">READY TO PUBLISH</span><strong>{selected.name}</strong><small>{activeTheme === draftTheme ? 'This is currently live for all users.' : 'Publishing updates the theme for all users on their next refresh.'}</small></div><button type="button" className="primary-button studio-publish-button" onClick={onPublish} disabled={busy || draftTheme === activeTheme}><Icon name="check" size={17}/>{busy ? 'Publishing…' : draftTheme === activeTheme ? 'Already live' : 'Publish live theme'}</button></div>
  </section>
}

function ProfilePage({ user, theme, onSave, onVerify, onSendEmail, onSendMpinOtp, onSaveMpin, onSupport, onAdmin, onLogout, notify }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name || '')
  const [email, setEmail] = useState(user.email || '')
  const [busy, setBusy] = useState(false)
  async function save(event) { event.preventDefault(); setBusy(true); try { await onSave({ name, email }); setEditing(false) } catch (error) { notify(error.message) } finally { setBusy(false) } }
  async function run(action) { setBusy(true); try { await action() } catch (error) { notify(error.message) } finally { setBusy(false) } }
  return <><PageHeading eyebrow="YOUR ARVO ACCOUNT" title="Profile & verification" subtitle="Manage your account details and verification status."/><section className="profile-card" id="profile-details"><div className="profile-avatar">{initials(user.name)}</div><div className="profile-details"><span className="eyebrow">{user.role === 'admin' ? 'ADMINISTRATOR' : 'ARVO MEMBER'}</span><h2>{user.name || 'Arvo member'}</h2><p>+91 {user.mobile} {user.email ? `· ${user.email}` : ''}</p></div><button className="outline-button profile-edit" onClick={() => setEditing(!editing)}>{editing ? 'Close' : 'Edit profile'}</button></section>{editing && <form className="profile-edit-form" onSubmit={save}><label>Name<input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required minLength="2"/></label><label>Email<input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}/></label><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form>}<section className="verification-section" id="kyc-section"><div className="section-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2>Verification status</h2></div></div><div className="verification-list"><div className="verification-row"><span className={`verification-icon ${user.emailVerified ? 'verified' : 'pending'}`}><Icon name={user.emailVerified ? 'check' : 'user'} size={18}/></span><div><strong>Email address</strong><span>{user.email || 'No email address added'}</span></div>{user.emailVerified ? <StatusPill status="verified"/> : <button className="inline-link" disabled={busy || !user.email} onClick={() => run(onSendEmail)}>Verify email <Icon name="chevron" size={14}/></button>}</div><div className="verification-row"><span className={`verification-icon ${user.profileStatus === 'verified' ? 'verified' : 'pending'}`}><Icon name={user.profileStatus === 'verified' ? 'check' : 'user'} size={18}/></span><div><strong>Profile verification</strong><span>{user.profileStatus === 'verified' ? 'Your profile is verified' : 'Submit your profile for administrator review'}</span></div>{user.profileStatus === 'verified' ? <StatusPill status="verified"/> : user.profileStatus === 'pending' ? <StatusPill status="pending"/> : <button className="inline-link" disabled={busy} onClick={() => run(onVerify)}>Submit <Icon name="chevron" size={14}/></button>}</div><div className="verification-row"><span className="verification-icon verified"><Icon name="check" size={18}/></span><div><strong>Mobile number</strong><span>+91 {user.mobile}</span></div><StatusPill status="verified"/></div></div></section><MpinManager user={user} onSendOtp={onSendMpinOtp} onSave={onSaveMpin} notify={notify}/><section className="profile-bottom-grid"><div className="preferences-card"><span className="eyebrow">PREFERENCES</span><h3>Your experience</h3><div className="preference-row"><span>Language</span><strong>English</strong></div><div className="preference-row"><span>Appearance</span><strong>{themes.find((item) => item.id === theme)?.name || 'Emerald Luxe'}</strong></div></div><div className="support-card"><span className="support-icon"><Icon name="help" size={19}/></span><div><span className="eyebrow">ACCOUNT SUPPORT</span><h3>Live chat</h3><p>Message the Arvo administrator from your account.</p><button className="inline-link" onClick={onSupport}>Open conversation <Icon name="chevron" size={14}/></button></div></div></section><div className="profile-actions">{user.role === 'admin' && <button className="outline-button" onClick={onAdmin}><Icon name="shield" size={16}/> Open admin panel</button>}<button className="text-button" onClick={onLogout}>Sign out</button></div></>
}

function MpinManager({ user, onSendOtp, onSave, notify }) {
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [mpin, setMpin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode() {
    setBusy(true); setError('')
    try {
      const result = await onSendOtp()
      setSent(true); setOtp(''); setDemoOtp(result.demoOtp || '')
      notify(result.demoOtp ? 'Local preview OTP: ' + result.demoOtp : 'MPIN verification OTP sent')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  async function saveMpin(event) {
    event.preventDefault()
    if (mpin !== confirm) return setError('The MPIN entries do not match.')
    setBusy(true); setError('')
    try {
      await onSave({ otp, mpin })
      setSent(false); setOtp(''); setMpin(''); setConfirm(''); setDemoOtp('')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return <section className="mpin-card" id="withdrawal-mpin"><div className="mpin-card-heading"><div><span className="eyebrow">WITHDRAWAL SECURITY</span><h2>6-digit MPIN</h2><p>Use this PIN to confirm every withdrawal request.</p></div>{user.mpinSet && user.profileStatus === 'verified' && <StatusPill status="verified"/>}</div>{user.profileStatus !== 'verified' ? <div className="mpin-locked"><Icon name="lock" size={18}/><span>Complete KYC verification before creating a withdrawal MPIN.</span></div> : <div className="mpin-content"><div className="mpin-status-line"><span>{user.mpinSet ? 'A withdrawal MPIN is active for this account.' : 'Create an MPIN to protect withdrawal requests.'}</span>{!sent && <button className="outline-button compact-button" onClick={sendCode} disabled={busy}>{busy ? 'Sending…' : user.mpinSet ? 'Reset with OTP' : 'Create with OTP'}</button>}</div>{sent && <form className="mpin-form" onSubmit={saveMpin}><label>Verification code<input className="form-input" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit OTP" inputMode="numeric" autoComplete="one-time-code" required/></label><label>New MPIN<input className="form-input" type="password" value={mpin} onChange={(event) => setMpin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" inputMode="numeric" autoComplete="new-password" required/></label><label>Confirm MPIN<input className="form-input" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Repeat your MPIN" inputMode="numeric" autoComplete="new-password" required/></label><button className="primary-button" disabled={busy || otp.length < 4 || mpin.length !== 6 || confirm.length !== 6}>{busy ? 'Saving…' : user.mpinSet ? 'Reset MPIN' : 'Save MPIN'}</button><button type="button" className="text-button" onClick={() => { setSent(false); setError(''); setOtp('') }}>Cancel</button>{demoOtp && <p className="demo-otp-note">Local demo mode code: <strong>{demoOtp}</strong></p>}</form>}{error && <p className="form-error" role="alert">{error}</p>}</div>}</section>
}

function AuthPage({ mode = 'Login', onNavigate, onSignedIn, notify }) {
  const isRegister = mode === 'Register'
  const isReset = mode === 'PasswordReset'
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState(new URLSearchParams(window.location.search).get('ref') || '')
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [demoOtp, setDemoOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function refreshCaptcha() {
    setCaptchaAnswer('')
    try {
      const challenge = await api('/auth/captcha')
      setCaptcha(challenge)
    } catch (err) {
      setCaptcha(null)
      setError(err.message || 'Could not load the numeric CAPTCHA. Refresh and try again.')
    }
  }

  useEffect(() => { refreshCaptcha() }, [])

  async function submitAuth(event) {
    event.preventDefault()
    setError('')
    if (isRegister && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    if (!captcha?.challengeId) {
      setError('Refresh the numeric CAPTCHA before continuing.')
      return
    }
    setBusy(true)
    try {
      const result = await api(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: {
          mobile,
          password,
          ...(isRegister ? { confirmPassword, referralCode } : {}),
          captchaChallengeId: captcha.challengeId,
          captchaAnswer,
        },
      })
      onSignedIn(result.user)
      notify(isRegister ? 'Your Arvo account is ready.' : 'Welcome back to Arvo.')
    } catch (err) {
      setError(err.message)
      await refreshCaptcha()
    } finally { setBusy(false) }
  }

  async function sendResetCode(event) {
    event.preventDefault()
    setError('')
    if (!captcha?.challengeId) {
      setError('Refresh the numeric CAPTCHA before continuing.')
      return
    }
    setBusy(true)
    try {
      const result = await api('/auth/password/reset/send', {
        method: 'POST',
        body: { mobile, captchaChallengeId: captcha.challengeId, captchaAnswer },
      })
      setOtpSent(true)
      setDemoOtp(result.demoOtp || '')
      notify(result.demoOtp ? 'Preview code: ' + result.demoOtp : 'If an account exists, a recovery code has been sent.')
      await refreshCaptcha()
    } catch (err) {
      setError(err.message)
      await refreshCaptcha()
    } finally { setBusy(false) }
  }

  async function resetPassword(event) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const result = await api('/auth/password/reset', { method: 'POST', body: { mobile, otp, password } })
      onSignedIn(result.user)
      notify('Your password has been updated.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const heading = isRegister ? 'Create your Arvo account' : isReset ? otpSent ? 'Choose a new password' : 'Recover your account' : 'Sign in to Arvo'
  const description = isRegister
    ? 'Set up your account with a password and a quick numeric verification.'
    : isReset
      ? otpSent ? 'Enter the SMS code and choose a new password.' : 'Verify your mobile number to set or reset your password.'
      : 'Use your mobile number and password to continue.'

  return <section className="auth-page" aria-labelledby="auth-title">
    <div className="auth-card">
      <div className="auth-card-brand"><span className="brand-mark">A</span><span className="brand-word">arvo<span>.</span></span></div>
      <span className="eyebrow">{isRegister ? 'WELCOME TO ARVO' : isReset ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</span>
      <h1 id="auth-title">{heading}</h1>
      <p className="auth-intro">{description}</p>

      {isReset ? !otpSent ? <form onSubmit={sendResetCode} className="auth-form">
        <label className="field-label" htmlFor="auth-phone">Mobile number</label>
        <div className="phone-field"><span>+91</span><input id="auth-phone" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" inputMode="numeric" autoComplete="tel-national" required pattern="[0-9]{10}"/></div>
        <CaptchaField captcha={captcha} answer={captchaAnswer} onAnswer={setCaptchaAnswer} onRefresh={refreshCaptcha} disabled={busy}/>
        <button className="primary-button full-button" disabled={busy || mobile.length !== 10 || captchaAnswer.length !== 6}>{busy ? 'Sending code…' : 'Send recovery code'} <Icon name="chevron" size={17}/></button>
      </form> : <form onSubmit={resetPassword} className="auth-form">
        <div className="auth-mobile-note">Recovery code sent to <strong>+91 {mobile}</strong></div>
        <label className="field-label" htmlFor="auth-reset-otp">SMS verification code</label>
        <input className="form-input" id="auth-reset-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter code" inputMode="numeric" autoComplete="one-time-code" required/>
        <label className="field-label" htmlFor="auth-password">New password</label>
        <input className="form-input" id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength="8" maxLength="128" required/>
        <label className="field-label" htmlFor="auth-confirm-password">Confirm new password</label>
        <input className="form-input" id="auth-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter the password again" autoComplete="new-password" minLength="8" maxLength="128" required/>
        {demoOtp && <p className="demo-otp-note">Preview mode code: <strong>{demoOtp}</strong></p>}
        <button className="primary-button full-button" disabled={busy || otp.length < 4 || password.length < 8}>{busy ? 'Updating…' : 'Reset password and sign in'} <Icon name="chevron" size={17}/></button>
        <button className="text-button centered" type="button" onClick={() => { setOtpSent(false); setOtp(''); setDemoOtp(''); setError('') }}>Change mobile number</button>
      </form> : <form onSubmit={submitAuth} className="auth-form">
        <label className="field-label" htmlFor="auth-phone">Mobile number</label>
        <div className="phone-field"><span>+91</span><input id="auth-phone" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" inputMode="numeric" autoComplete="tel-national" required pattern="[0-9]{10}"/></div>
        <label className="field-label" htmlFor="auth-password">Password</label>
        <input className="form-input" id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'Create a password' : 'Your password'} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 8 : 1} maxLength="128" required/>
        {isRegister && <>
          <label className="field-label" htmlFor="auth-confirm-password">Confirm password</label>
          <input className="form-input" id="auth-confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" autoComplete="new-password" minLength="8" maxLength="128" required/>
          <label className="field-label" htmlFor="auth-referral">Referral code <span className="optional-label">Optional</span></label>
          <input className="form-input" id="auth-referral" value={referralCode} onChange={(event) => setReferralCode(event.target.value.toUpperCase())} placeholder="Enter referral code" autoCapitalize="characters"/>
        </>}
        <CaptchaField captcha={captcha} answer={captchaAnswer} onAnswer={setCaptchaAnswer} onRefresh={refreshCaptcha} disabled={busy}/>
        <button className="primary-button full-button" disabled={busy || mobile.length !== 10 || password.length < (isRegister ? 8 : 1) || (isRegister && confirmPassword.length < 8) || captchaAnswer.length !== 6}>{busy ? isRegister ? 'Creating account…' : 'Signing in…' : isRegister ? 'Create account' : 'Sign in'} <Icon name="chevron" size={17}/></button>
      </form>}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="auth-mode-switch">
        {isReset ? <>Remembered your password? <button type="button" onClick={() => onNavigate('Login')}>Sign in</button></> :
          isRegister ? <>Already have an account? <button type="button" onClick={() => onNavigate('Login')}>Sign in</button></> :
            <>New to Arvo? <button type="button" onClick={() => onNavigate('Register')}>Create an account</button></>}
      </div>
      {!isReset && !isRegister && <button className="text-button centered auth-forgot-link" type="button" onClick={() => onNavigate('PasswordReset')}>Forgot or set password</button>}
      <div className="auth-security"><Icon name="lock" size={14}/> Your account details are protected.</div>
    </div>
  </section>
}

function CaptchaField({ captcha, answer, onAnswer, onRefresh, disabled }) {
  return <div className="captcha-field">
    <span className="field-label">Numeric CAPTCHA</span>
    <div className="captcha-image-row">
      {captcha?.image ? <img src={captcha.image} alt="Six digit numeric CAPTCHA"/> : <div className="captcha-placeholder">Loading verification…</div>}
      <button className="captcha-refresh" type="button" onClick={onRefresh} disabled={disabled} aria-label="Refresh numeric CAPTCHA">↻ <span>Refresh</span></button>
    </div>
    <label className="field-label" htmlFor="auth-captcha-answer">Enter the 6 digits shown</label>
    <input className="form-input captcha-answer" id="auth-captcha-answer" value={answer} onChange={(event) => onAnswer(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Six-digit code" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" required/>
  </div>
}

function WalletActionModal({ type, user, methods, onClose, onSubmit, notify }) {
  const [amount, setAmount] = useState('')
  const [requestKey, setRequestKey] = useState(newRequestKey)
  const [methodKey, setMethodKey] = useState(methods[0]?.key || '')
  const [paymentReference, setPaymentReference] = useState('')
  const [recipientMobile, setRecipientMobile] = useState('')
  const [note, setNote] = useState('')
  const [mpin, setMpin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const method = methods.find((item) => item.key === methodKey)
  const title = type === 'deposit' ? 'Request a deposit' : type === 'withdrawal' ? 'Request a withdrawal' : 'Transfer to an Arvo member'
  const update = (setter, value) => { setter(value); setRequestKey(newRequestKey()) }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    const payload = type === 'deposit' ? { amount, methodKey, paymentReference } : type === 'withdrawal' ? { amount, payoutNote: note, mpin } : { amount, recipientMobile, note }
    try { await onSubmit(type, payload, requestKey); setRequestKey(newRequestKey()) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="action-modal"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><span className="eyebrow">WALLET</span><h2>{title}</h2><p>{type === 'deposit' ? 'Submit a payment reference after paying through one of the enabled methods.' : type === 'withdrawal' ? 'Your available balance is reserved while an administrator reviews the request.' : 'Transfers move funds immediately between active Arvo wallets.'}</p><form className="action-form" onSubmit={submit}><label className="field-label" htmlFor="wallet-amount">Amount (USDT)</label><input className="form-input" id="wallet-amount" value={amount} onChange={(e) => update(setAmount, e.target.value)} inputMode="decimal" placeholder="0.00" required/>{type === 'deposit' && <><label className="field-label" htmlFor="deposit-method">Payment method</label><select className="form-input" id="deposit-method" value={methodKey} onChange={(e) => update(setMethodKey, e.target.value)} required><option value="">Choose a method</option>{methods.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>{method && <div className="payment-instructions"><strong>{method.label}</strong><p>{method.instructions}</p></div>}<label className="field-label" htmlFor="payment-reference">Payment reference / UTR</label><input className="form-input" id="payment-reference" value={paymentReference} onChange={(e) => update(setPaymentReference, e.target.value)} placeholder="Reference from your payment" required minLength="6"/></>}{type === 'transfer' && <><label className="field-label" htmlFor="recipient-mobile">Recipient mobile</label><div className="phone-field"><span>+91</span><input id="recipient-mobile" value={recipientMobile} onChange={(e) => update(setRecipientMobile, e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" inputMode="numeric" required/></div><label className="field-label" htmlFor="transfer-note">Note <span className="optional-label">Optional</span></label><input className="form-input" id="transfer-note" value={note} onChange={(e) => update(setNote, e.target.value)} maxLength="160" placeholder="Add a note"/></>}{type === 'withdrawal' && <><label className="field-label" htmlFor="withdrawal-mpin">6-digit withdrawal MPIN</label><input className="form-input otp-entry" id="withdrawal-mpin" type="password" value={mpin} onChange={(event) => update(setMpin, event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter your MPIN" inputMode="numeric" autoComplete="current-password" required/><div className="payment-instructions"><strong>Payout processing</strong><p>After approval, the administrator will contact you through your verified account details.</p><input className="form-input" value={note} onChange={(e) => update(setNote, e.target.value)} maxLength="300" placeholder="Optional payout note"/></div>{user?.profileStatus !== 'verified' ? <p className="form-error">Profile verification is required before withdrawing.</p> : !user?.mpinSet ? <p className="form-error">Create your MPIN from Profile before requesting a withdrawal.</p> : null}</>}<button className="primary-button full-button" disabled={busy || (type === 'deposit' && methods.length === 0) || (type === 'withdrawal' && (mpin.length !== 6 || user?.profileStatus !== 'verified' || !user?.mpinSet))}>{busy ? 'Submitting…' : type === 'transfer' ? 'Transfer funds' : 'Submit request'} <Icon name="chevron" size={16}/></button></form>{error && <p className="form-error">{error}</p>}{type === 'deposit' && !methods.length && <p className="form-error">No deposit methods are enabled. Contact the administrator.</p>}</div></div>
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

function AdminPlanTerms({ plan, busy, onSave }) {
  const [cycle, setCycle] = useState(plan.cycle || 'monthly')
  const [durationDays, setDurationDays] = useState(String(plan.durationDays || 30))
  const [investmentRoiPct, setInvestmentRoiPct] = useState(String(plan.investmentRoiPct ?? 0))
  const [profitReturn, setProfitReturn] = useState(String(plan.profitReturn ?? 0))
  return <div className="admin-plan-terms"><label>Cycle<select className="form-input" value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="one_time">One time</option></select></label><label>Duration (days)<input className="form-input" type="number" min="1" max="36500" step="1" value={durationDays} onChange={(event) => setDurationDays(event.target.value)}/></label><label>ROI (%)<input className="form-input" type="number" min="0" max="10000" step="0.01" value={investmentRoiPct} onChange={(event) => setInvestmentRoiPct(event.target.value)}/></label><label>Profit return (USDT)<input className="form-input" type="number" min="0" step="0.01" value={profitReturn} onChange={(event) => setProfitReturn(event.target.value)}/></label><button className="outline-button compact-button" disabled={busy || !durationDays || !investmentRoiPct || !profitReturn} onClick={() => onSave(plan, { cycle, durationDays, investmentRoiPct, profitReturn })}>Save terms</button></div>
}

function AdminPage({ notify, onRefresh }) {
  const tabs = ['Overview', 'Deposits', 'Withdrawals', 'Applications', 'Plans', 'Users', 'Content', 'Support', 'Themes', 'Settings', 'Ledger']
  const [tab, setTab] = useState('Overview')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [planForm, setPlanForm] = useState({ name: '', slug: '', category: 'Investment plan', summary: '', details: '', price: '', cycle: 'monthly', durationDays: '30', investmentRoiPct: '0', profitReturn: '0', riskLabel: 'See plan documents', termsUrl: '', isActive: true, imageUrl: '' })
  const [planPrices, setPlanPrices] = useState({})
  const [methodForm, setMethodForm] = useState({ key: '', label: '', instructions: '', active: true })
  const [settings, setSettings] = useState(null)
  const [themeDraft, setThemeDraft] = useState('emerald')
  const [integrations, setIntegrations] = useState(null)
  const [languagesText, setLanguagesText] = useState('en')
  const [search, setSearch] = useState('')

  async function load(nextTab = tab) {
    setBusy(true); setError('')
    try {
      const routes = { Overview: '/admin/overview', Deposits: '/admin/deposits', Withdrawals: '/admin/withdrawals', Applications: '/admin/applications', Plans: '/admin/plans', Users: `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`, Settings: '/admin/settings', Themes: '/admin/settings', Ledger: '/admin/ledger' }
      const result = await api(routes[nextTab])
      setData(result)
      if (nextTab === 'Settings' || nextTab === 'Themes') { setSettings(result.settings); setThemeDraft(result.settings.activeTheme || 'emerald'); setIntegrations(result.integrations || {}); setLanguagesText((result.settings.languages || ['en']).join(', ')) }
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
    await mutate('/admin/plans', 'POST', { ...planForm, slug, price: planForm.price }, 'Plan published')
    setPlanForm({ name: '', slug: '', category: 'Investment plan', summary: '', details: '', price: '', cycle: 'monthly', durationDays: '30', investmentRoiPct: '0', profitReturn: '0', riskLabel: 'See plan documents', termsUrl: '', isActive: true, imageUrl: '' })
  }
  async function savePlanPrice(plan) {
    const price = planPrices[plan._id] ?? plan.price ?? ''
    if (!String(price).trim()) return setError('Enter a fixed price for this plan.')
    await mutate(`/admin/plans/${plan._id}`, 'PATCH', { ...plan, price }, 'Fixed plan price saved')
  }

  async function savePlanTerms(plan, terms) {
    await mutate(`/admin/plans/${plan._id}`, 'PATCH', { ...plan, price: planPrices[plan._id] ?? plan.price, ...terms }, 'Investment terms saved')
  }

  async function handlePlanImage(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError('')
    try {
      const imageUrl = await compressPlanImage(file)
      setPlanForm((current) => ({ ...current, imageUrl }))
    } catch (err) {
      setError(err.message)
    } finally {
      input.value = ''
    }
  }

  async function updatePlanImage(plan, event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError('')
    try {
      const imageUrl = await compressPlanImage(file)
      await mutate(`/admin/plans/${plan._id}`, 'PATCH', { ...plan, price: plan.price, imageUrl }, 'Plan image updated')
    } catch (err) {
      setError(err.message)
    } finally {
      input.value = ''
    }
  }

  function addPaymentMethod() {
    if (!methodForm.key || !methodForm.label || !methodForm.instructions) return setError('Complete all payment method fields.')
    setSettings((current) => ({ ...current, paymentMethods: [...(current.paymentMethods || []), methodForm] }))
    setMethodForm({ key: '', label: '', instructions: '', active: true }); setError('')
  }
  async function publishTheme() {
    if (!settings || themeDraft === (settings.activeTheme || 'emerald')) return
    await mutate('/admin/theme', 'PATCH', { activeTheme: themeDraft }, 'Live theme updated for all Arvo users')
  }

  async function saveSettings() {
    if (!settings) return
    const languages = [...new Set(languagesText.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean))]
    await mutate('/admin/settings', 'PUT', { paymentMethods: settings.paymentMethods || [], languages, themeIds: settings.themeIds || themes.map((item) => item.id) }, 'Platform settings saved')
  }

  const titleForTab = { Overview: 'Administration', Deposits: 'Deposit management', Withdrawals: 'Withdrawal management', Applications: 'Plan applications', Plans: 'Plan management', Users: 'Users management', Content: 'News & web management', Support: 'Live chat support', Themes: 'Theme management', Settings: 'Platform settings', Ledger: 'Transaction log' }
  return <><PageHeading eyebrow="ARVO CONTROL CENTRE" title={titleForTab[tab]} subtitle="Review account activity and manage published platform data."/><div className="admin-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'selected' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>{busy && <div className="inline-loading">Loading…</div>}{error && <p className="form-error admin-error">{error}</p>}
    {tab === 'Overview' && data?.overview && <><div className="admin-stat-grid">{[['Users',data.overview.users],['Active users',data.overview.activeUsers],['Published plans',data.overview.plans],['Pending deposits',data.overview.pendingDeposits],['Pending withdrawals',data.overview.pendingWithdrawals],['Plan applications',data.overview.pendingApplications]].map(([label,value]) => <div className="admin-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><section className="section-block"><div className="section-heading"><div><span className="eyebrow">LATEST LEDGER ENTRIES</span><h2>Recent account activity</h2></div><button className="inline-link" onClick={() => setTab('Ledger')}>Open log <Icon name="chevron" size={15}/></button></div><LedgerTable entries={data.overview.recentEntries || []}/></section></>}
    {tab === 'Deposits' && <RequestTable items={data?.deposits || []} type="deposit" onDecision={(item, decision) => mutate(`/admin/deposits/${item._id}/review`, 'PATCH', { decision }, `Deposit ${decision}ed`)}/>}
    {tab === 'Withdrawals' && <RequestTable items={data?.withdrawals || []} type="withdrawal" onDecision={(item, decision) => mutate(`/admin/withdrawals/${item._id}/review`, 'PATCH', { decision }, `Withdrawal ${decision}`)}/>}
    {tab === 'Applications' && <RequestTable items={data?.applications || []} type="application" onDecision={(item, decision) => mutate(`/admin/applications/${item._id}/review`, 'PATCH', { decision }, `Application ${decision}ed`)}/>}
    {tab === 'Plans' && <div className="admin-columns"><form className="admin-form-card" onSubmit={addPlan}><span className="eyebrow">PUBLISH A PLAN</span><h3>New investment plan</h3><label>Plan name<input className="form-input" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required/></label><label>Slug<input className="form-input" value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} placeholder="Auto-generated from name"/></label><label>Category<input className="form-input" value={planForm.category} onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}/></label><label>Short summary<textarea className="form-input" value={planForm.summary} onChange={(e) => setPlanForm({ ...planForm, summary: e.target.value })} maxLength="500"/></label><label>Plan details<textarea className="form-input" value={planForm.details} onChange={(e) => setPlanForm({ ...planForm, details: e.target.value })}/></label><label>Fixed price (USDT)<input className="form-input" type="number" min="0.01" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} required inputMode="decimal"/></label><label>Investment cycle<select className="form-input" value={planForm.cycle} onChange={(e) => setPlanForm({ ...planForm, cycle: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option><option value="one_time">One time</option></select></label><label>Duration (days)<input className="form-input" type="number" min="1" max="36500" step="1" value={planForm.durationDays} onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })} required inputMode="numeric"/></label><label>Investment ROI (%)<input className="form-input" type="number" min="0" max="10000" step="0.01" value={planForm.investmentRoiPct} onChange={(e) => setPlanForm({ ...planForm, investmentRoiPct: e.target.value })} required inputMode="decimal"/></label><label>Profit return (USDT)<input className="form-input" type="number" min="0" step="0.01" value={planForm.profitReturn} onChange={(e) => setPlanForm({ ...planForm, profitReturn: e.target.value })} required inputMode="decimal"/></label><label>Risk label<input className="form-input" value={planForm.riskLabel} onChange={(e) => setPlanForm({ ...planForm, riskLabel: e.target.value })}/></label><label>Terms URL<input className="form-input" type="url" value={planForm.termsUrl} onChange={(e) => setPlanForm({ ...planForm, termsUrl: e.target.value })} placeholder="https://"/></label><div className="plan-image-field"><span className="plan-image-title">Plan image <span>(optional)</span></span><label className="plan-image-picker"><span>{planForm.imageUrl ? 'Replace plan image' : 'Choose plan image'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePlanImage}/></label><span className="plan-image-help">JPEG, PNG or WebP. Optimized for faster mobile loading.</span>{planForm.imageUrl && <div className="plan-image-preview"><img src={planForm.imageUrl} alt="Plan preview"/><button type="button" className="outline-button compact-button" onClick={() => setPlanForm((current) => ({ ...current, imageUrl: '' }))}>Remove image</button></div>}</div><button className="primary-button" disabled={busy}>Publish plan</button></form><div className="admin-table-card"><span className="eyebrow">CURRENT PLANS</span>{(data?.plans || []).map((plan) => <div className="admin-list-row admin-plan-row" key={plan._id}>{plan.imageUrl && <img className="admin-plan-thumb" src={plan.imageUrl} alt=""/>}<div className="admin-plan-summary"><strong>{plan.name}</strong><span>{plan.pricePaise ? formatUSDT(plan.pricePaise, true) : 'Price not set'} · {plan.isActive ? 'Active' : 'Hidden'}</span></div><label className="admin-plan-price"><span>Fixed price (USDT)</span><input className="form-input" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Enter price" value={planPrices[plan._id] ?? plan.price ?? ''} onChange={(event) => setPlanPrices((current) => ({ ...current, [plan._id]: event.target.value }))}/></label><AdminPlanTerms plan={plan} busy={busy} onSave={savePlanTerms}/><div className="admin-plan-actions"><button className="outline-button compact-button" disabled={busy || !String(planPrices[plan._id] ?? plan.price ?? '').trim()} onClick={() => savePlanPrice(plan)}>Save price</button><label className="outline-button compact-button plan-image-change">{plan.imageUrl ? 'Change image' : 'Add image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => updatePlanImage(plan, event)}/></label>{plan.imageUrl && <button className="outline-button compact-button" onClick={() => mutate(`/admin/plans/${plan._id}`, 'PATCH', { ...plan, price: plan.price, imageUrl: '' }, 'Plan image removed')}>Remove</button>}<button className="outline-button compact-button" disabled={busy || (!plan.isActive && !plan.pricePaise)} onClick={() => mutate(`/admin/plans/${plan._id}`, 'PATCH', { ...plan, price: plan.price, isActive: !plan.isActive }, plan.isActive ? 'Plan hidden' : 'Plan published')}>{plan.isActive ? 'Hide' : 'Publish'}</button></div></div>)}</div></div>}
    {tab === 'Users' && <><form className="admin-search" onSubmit={(e) => { e.preventDefault(); load('Users') }}><input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mobile or name"/><button className="outline-button">Search</button></form><div className="admin-table-card">{(data?.users || []).map((item) => <div className="admin-user-row" key={item.id}><div><strong>{item.name || 'New member'}</strong><span>+91 {item.mobile} · {item.email || 'No email'}</span></div><StatusPill status={item.profileStatus}/><button className="outline-button compact-button" onClick={() => mutate(`/admin/users/${item.id}`, 'PATCH', { profileStatus: item.profileStatus === 'verified' ? 'pending' : 'verified' }, item.profileStatus === 'verified' ? 'Verification reset' : 'Profile verified')}>{item.profileStatus === 'verified' ? 'Reset verification' : 'Verify profile'}</button><button className="outline-button compact-button" onClick={() => mutate(`/admin/users/${item.id}`, 'PATCH', { status: item.status === 'active' ? 'blocked' : 'active' }, item.status === 'active' ? 'User blocked' : 'User activated')}>{item.status === 'active' ? 'Block' : 'Activate'}</button></div>)}</div></>}
    {tab === 'Themes' && settings && <ThemeStudio activeTheme={settings.activeTheme || 'emerald'} draftTheme={themeDraft} onSelect={setThemeDraft} onPublish={publishTheme} busy={busy}/>}
    {tab === 'Settings' && settings && <div className="admin-settings-grid"><section className="admin-form-card"><span className="eyebrow">DEPOSIT METHODS</span><h3>Payment instructions</h3><p>These instructions appear to users. Requests stay pending until an administrator verifies the payment outside Arvo.</p>{(settings.paymentMethods || []).map((method, index) => <div className="method-edit-row" key={`${method.key}-${index}`}><label>Label<input className="form-input" value={method.label} onChange={(e) => setSettings({ ...settings, paymentMethods: settings.paymentMethods.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })}/></label><label>Instructions<textarea className="form-input" value={method.instructions} onChange={(e) => setSettings({ ...settings, paymentMethods: settings.paymentMethods.map((item, i) => i === index ? { ...item, instructions: e.target.value } : item) })}/></label><label className="checkbox-row"><input type="checkbox" checked={method.active} onChange={(e) => setSettings({ ...settings, paymentMethods: settings.paymentMethods.map((item, i) => i === index ? { ...item, active: e.target.checked } : item) })}/> Active</label><button className="text-button" onClick={() => setSettings({ ...settings, paymentMethods: settings.paymentMethods.filter((_, i) => i !== index) })}>Remove</button></div>)}<div className="method-add-form"><label>Key<input className="form-input" value={methodForm.key} onChange={(e) => setMethodForm({ ...methodForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="upi-main"/></label><label>Display label<input className="form-input" value={methodForm.label} onChange={(e) => setMethodForm({ ...methodForm, label: e.target.value })} placeholder="UPI transfer"/></label><label>Payment instructions<textarea className="form-input" value={methodForm.instructions} onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })} placeholder="Add the payment details users should see"/></label><button className="outline-button" type="button" onClick={addPaymentMethod}><Icon name="plus" size={15}/> Add method</button></div><button className="primary-button" onClick={saveSettings} disabled={busy}>Save platform settings</button></section><section className="admin-form-card"><span className="eyebrow">APP THEMES</span><h3>Available themes</h3><p>All users see the one theme published in the Themes tab.</p><div className="theme-admin-list">{themes.map((item) => <span key={item.id}><i style={{ background: item.colors[0] }}/>{item.name}{settings.activeTheme === item.id ? ' · Live' : ''}</span>)}</div><span className="eyebrow settings-note">EMAIL SETTINGS</span><p className={integrations?.emailConfigured ? 'integration-state integration-ready' : 'integration-state'}>{integrations?.emailConfigured ? 'SMTP is configured. Email verification messages can be sent.' : 'SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASSWORD to the API environment to enable verification email.'}</p><span className="eyebrow settings-note">LANGUAGE CODES</span><label>Enabled content languages<input className="form-input" value={languagesText} onChange={(e) => setLanguagesText(e.target.value)} placeholder="en, hi"/></label><p>Use ISO language codes for content records. Add translated content for each code before publishing it.</p><button className="primary-button" onClick={saveSettings} disabled={busy}>Save platform settings</button></section></div>}
    {tab === 'Content' && <ContentManager onChanged={onRefresh}/>}
    {tab === 'Support' && <AdminSupportPanel/>}
    {tab === 'Ledger' && <LedgerTable entries={data?.entries || []}/>}
  </>
}

function RequestTable({ items, type, onDecision }) {
  if (!items.length) return <EmptyState title={`No ${type} requests`} description="New requests will appear here for administrator review."/>
  return <div className="admin-table-card">{items.map((item) => <div className="admin-request-row" key={item._id}><div className="request-user"><strong>{item.userId?.name || 'Arvo member'}</strong><span>+91 {item.userId?.mobile || '—'} · {new Date(item.createdAt).toLocaleString()}</span>{type === 'deposit' && <span>Method: {item.methodKey} · Ref: {item.paymentReference}</span>}{type === 'application' && <span>Plan: {item.planId?.name || 'Plan'}</span>}</div><strong>{formatUSDT(item.amountPaise, true)}</strong><StatusPill status={item.status}/><div className="request-actions">{type === 'withdrawal' && item.status === 'approved' && <button className="primary-button compact-button" onClick={() => onDecision(item, 'paid')}>Mark paid</button>}{item.status === 'pending' && <><button className="primary-button compact-button" onClick={() => onDecision(item, type === 'withdrawal' ? 'approve' : 'accept')}>{type === 'withdrawal' ? 'Approve' : 'Accept'}</button><button className="outline-button compact-button" onClick={() => onDecision(item, 'reject')}>Reject</button></>}</div></div>)}</div>
}

function LedgerTable({ entries }) {
  if (!entries.length) return <EmptyState title="No ledger entries yet" description="Posted wallet activity will be listed here."/>
  return <div className="admin-table-card ledger-table">{entries.map((entry) => <div className="admin-list-row" key={entry._id}><div><strong>{entry.description || entry.kind}</strong><span>{entry.userId?.name || 'Member'} · {entry.userId?.mobile || ''} · {new Date(entry.createdAt).toLocaleString()}</span></div><strong className={entry.direction === 'credit' ? 'ledger-credit' : ''}>{entry.direction === 'credit' ? '+' : '−'} {formatUSDT(entry.amountPaise, true)}</strong><StatusPill status={entry.status}/></div>)}</div>
}

export default App
