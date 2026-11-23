import { useState } from 'react'

const plans = [
  { id: 'aurelia', name: 'Aurelia Income', kind: 'INCOME STRATEGY', tint: 'gold', min: '₹25,000', term: '12 months', range: '8–10%', copy: 'A measured approach built around steady progress and a clear horizon.', icon: 'sun' },
  { id: 'solstice', name: 'Solstice Growth', kind: 'GROWTH STRATEGY', tint: 'green', min: '₹50,000', term: '18 months', range: '10–14%', copy: 'A longer view for investors comfortable with a more dynamic journey.', icon: 'spark' },
  { id: 'sovereign', name: 'Sovereign Reserve', kind: 'BALANCED STRATEGY', tint: 'blue', min: '₹1,00,000', term: '24 months', range: '9–12%', copy: 'A balanced plan combining a defined term with diversified exposure.', icon: 'shield' },
]

const transactions = [
  { title: 'Wallet deposit', detail: 'Today · 10:42 AM', amount: '+ ₹10,000', type: 'positive', icon: 'arrowDown' },
  { title: 'Aurelia Income', detail: 'Investment · 18 Nov', amount: '− ₹25,000', type: 'neutral', icon: 'chart' },
  { title: 'Referral reward · Level 1', detail: 'Reward · 16 Nov', amount: '+ ₹750', type: 'positive', icon: 'gift' },
]

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
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close: <><path d="m18 6-12 12M6 6l12 12"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-.9 1-1.9 1.2-1.9 2.9M12 17h.01"/></>,
}

function Icon({ name, size = 20, strokeWidth = 1.7, className = '' }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name] || iconPaths.spark}</svg>
}

function Money({ children, className = '' }) { return <span className={className}>{children}</span> }

function PlanCard({ plan, onOpen, compact = false }) {
  return (
    <button className={`plan-card ${compact ? 'plan-card-compact' : ''}`} onClick={() => onOpen(plan)}>
      <div className={`plan-art ${plan.tint}`}><span className="plan-symbol"><Icon name={plan.icon} size={26} /></span><span className="plan-art-label">ARVO · PRIVATE WEALTH</span><span className="plan-orbit orbit-one"/><span className="plan-orbit orbit-two"/></div>
      <div className="plan-card-body">
        <span className="eyebrow">{plan.kind}</span>
        <div className="plan-title-row"><h3>{plan.name}</h3><Icon name="chevron" size={17}/></div>
        <p>{plan.copy}</p>
        <div className="plan-meta"><span>From <b>{plan.min}</b></span><span className="meta-dot"/><span>{plan.term}</span></div>
      </div>
    </button>
  )
}

function App() {
  const [page, setPage] = useState('Home')
  const [theme, setTheme] = useState('emerald')
  const [themeOpen, setThemeOpen] = useState(false)
  const [activePlan, setActivePlan] = useState(null)
  const [toast, setToast] = useState('')
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const notify = (message) => {
    setToast(message)
    window.clearTimeout(window.toastTimer)
    window.toastTimer = window.setTimeout(() => setToast(''), 2600)
  }
  const openPlan = (plan) => { setActivePlan(plan); setPage('Plans'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const copyReferral = async () => {
    try { await navigator.clipboard.writeText('ARVO-ALEX-24'); notify('Referral code copied') }
    catch { notify('Your referral code is ARVO-ALEX-24') }
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <button className="brand" onClick={() => { setPage('Home'); setActivePlan(null) }} aria-label="Arvo home"><span className="brand-mark">A</span><span className="brand-word">arvo<span>.</span></span></button>
        <div className="topbar-right">
          <div className="theme-wrap">
            <button className="theme-button" onClick={() => setThemeOpen(!themeOpen)}><span className="theme-dots">{themes.find((item) => item.id === theme)?.colors.map((color) => <i key={color} style={{ background: color }}/>)}</span><span className="theme-button-label">{themes.find((item) => item.id === theme)?.name}</span><span className="tiny-caret">⌄</span></button>
            {themeOpen && <div className="theme-menu">{themes.map((item) => <button key={item.id} onClick={() => { setTheme(item.id); setThemeOpen(false) }}><span className="theme-dots">{item.colors.map((color) => <i key={color} style={{ background: color }}/>)}</span><span>{item.name}</span>{theme === item.id && <Icon name="check" size={15}/>}</button>)}</div>}
          </div>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify('You’re all caught up')}><Icon name="bell"/><i/></button>
          <button className="avatar-button" onClick={() => setPage('Profile')} aria-label="Open profile">AS</button>
        </div>
      </header>

      <main className="main-content">
        {page === 'Home' && !activePlan && <HomePage onOpenPlan={openPlan} setPage={setPage} notify={notify}/>} 
        {page === 'Plans' && !activePlan && <PlansPage onOpenPlan={openPlan}/>}
        {page === 'Plans' && activePlan && <PlanDetail plan={activePlan} onBack={() => setActivePlan(null)} notify={notify}/>} 
        {page === 'Wallet' && <WalletPage notify={notify}/>}
        {page === 'Referrals' && <ReferralPage onCopy={copyReferral}/>}
        {page === 'Profile' && <ProfilePage onLogin={() => setShowLogin(true)} notify={notify}/>}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {[['Home','home'],['Plans','layers'],['Wallet','wallet'],['Referrals','users'],['Profile','user']].map(([label, icon]) => <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => { setPage(label); setActivePlan(null) }}><Icon name={icon} size={20}/><span>{label}</span></button>)}
      </nav>

      {showLogin && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setShowLogin(false); setOtpSent(false) } }}><div className="login-modal"><button className="modal-close" onClick={() => { setShowLogin(false); setOtpSent(false) }}><Icon name="close"/></button><span className="brand-mark modal-brand-mark">A</span><span className="eyebrow">WELCOME TO ARVO</span><h2>{otpSent ? 'Check your messages' : 'A more considered way forward.'}</h2><p>{otpSent ? `Enter the six-digit code sent to +91 ${phone || 'your number'}.` : 'Sign in securely with your mobile number.'}</p>{!otpSent ? <><label className="field-label" htmlFor="phone">Mobile number</label><div className="phone-field"><span>+91</span><input id="phone" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" inputMode="numeric"/></div><button className="primary-button full-button" onClick={() => { if (phone.length < 10) notify('Enter a valid 10-digit mobile number'); else { setOtpSent(true); notify('Demo OTP flow started') } }}>Send secure OTP <Icon name="chevron" size={17}/></button></> : <><div className="otp-boxes">{[1,2,3,4,5,6].map((number) => <input key={number} aria-label={`OTP digit ${number}`} maxLength="1" inputMode="numeric" onChange={(event) => { if (event.target.value) event.target.nextElementSibling?.focus() }}/>)}</div><button className="primary-button full-button" onClick={() => { setOtpSent(false); setShowLogin(false); notify('OTP connection will be enabled with Fast2SMS') }}>Verify and continue <Icon name="chevron" size={17}/></button><button className="text-button centered" onClick={() => notify('A new code can be requested after the resend timer')}>Resend code</button></>}</div></div>}
      {toast && <div className="toast"><span className="toast-check"><Icon name="check" size={14}/></span>{toast}</div>}
    </div>
  )
}

function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div> }

function HomePage({ onOpenPlan, setPage, notify }) {
  return <>
    <section className="welcome-row"><div><span className="eyebrow">MONDAY, 23 NOVEMBER 2026</span><h1>Good afternoon, Alex<span className="greeting-dot">.</span></h1><p>Your financial picture, thoughtfully brought together.</p></div><button className="help-link" onClick={() => notify('Arvo concierge is coming soon')}><Icon name="help" size={17}/> Arvo concierge</button></section>
    <section className="hero-grid">
      <div className="balance-card">
        <div className="balance-card-top"><span className="balance-label"><span className="live-dot"/> TOTAL PORTFOLIO VALUE</span><button onClick={() => notify('Portfolio value is visible')} aria-label="Portfolio visibility"><Icon name="spark" size={17}/></button></div>
        <div className="balance-value">₹1,28,450<span className="balance-decimal">.00</span></div>
        <div className="balance-change"><span className="change-pill">↗ 6.8%</span><span>overall change this month</span></div>
        <div className="balance-footer"><div><span>Invested</span><strong>₹1,10,000</strong></div><div><span>Available balance</span><strong>₹18,450</strong></div><button className="balance-arrow" onClick={() => setPage('Wallet')}><Icon name="chevron" size={20}/></button></div>
        <div className="hero-line" aria-hidden="true"><svg viewBox="0 0 560 110" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".19"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d="M0 93 C38 83 42 58 76 66 S119 87 153 65 198 41 229 58 275 75 305 48 352 39 382 47 426 26 460 38 503 14 560 9 V110 H0Z" fill="url(#area)"/><path d="M0 93 C38 83 42 58 76 66 S119 87 153 65 198 41 229 58 275 75 305 48 352 39 382 47 426 26 460 38 503 14 560 9" fill="none" stroke="currentColor" strokeWidth="2"/></svg></div>
      </div>
      <div className="side-cards"><div className="small-stat-card"><div className="stat-card-top"><span className="stat-icon"><Icon name="chart" size={18}/></span><span className="stat-change">+ ₹3,240</span></div><span className="eyebrow">TOTAL EARNINGS</span><strong>₹18,450</strong><span className="stat-caption">Across all active plans</span></div><div className="small-stat-card second-stat"><div className="stat-card-top"><span className="stat-icon lavender"><Icon name="layers" size={18}/></span><span className="eyebrow">ACTIVE PLANS</span></div><strong>02<span className="stat-caption-inline"> of 03</span></strong><button className="inline-link" onClick={() => setPage('Plans')}>View your plans <Icon name="chevron" size={14}/></button></div></div>
    </section>
    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Explore investment plans</h2></div><button className="inline-link" onClick={() => setPage('Plans')}>View all <Icon name="chevron" size={15}/></button></div><div className="plan-grid home-plans">{plans.slice(0,2).map((plan) => <PlanCard key={plan.id} plan={plan} onOpen={onOpenPlan} compact/> )}</div></section>
    <section className="section-block activity-block"><div className="section-heading"><div><span className="eyebrow">A CLEAR RECORD</span><h2>Recent activity</h2></div><button className="inline-link" onClick={() => setPage('Wallet')}>All activity <Icon name="chevron" size={15}/></button></div><TransactionList items={transactions.slice(0,2)}/></section>
    <div className="demo-note"><span className="demo-mark">i</span><span>Illustrative dashboard data shown for preview. Investment details and returns are for demonstration only.</span></div>
  </>
}

function PlansPage({ onOpenPlan }) {
  return <><PageHeading eyebrow="THOUGHTFULLY CURATED" title="Investment plans" subtitle="Explore a strategy that feels right for your goals."/><div className="plan-intro"><div className="intro-seal"><Icon name="spark" size={24}/></div><div><strong>A plan for every horizon.</strong><p>Every plan has its own profile with clear terms, minimums and key information.</p></div></div><div className="plan-grid all-plans">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} onOpen={onOpenPlan}/>)}</div><div className="demo-note"><span className="demo-mark">i</span><span>Plan figures are illustrative placeholders for this interface preview.</span></div></>
}

function PlanDetail({ plan, onBack, notify }) {
  return <><button className="back-link" onClick={onBack}>← <span>All investment plans</span></button><div className="detail-grid"><div><div className={`detail-art plan-art ${plan.tint}`}><span className="plan-symbol"><Icon name={plan.icon} size={34}/></span><span className="plan-art-label">ARVO · PRIVATE WEALTH</span><span className="plan-orbit orbit-one"/><span className="plan-orbit orbit-two"/></div><div className="detail-overview"><span className="eyebrow">{plan.kind}</span><h1>{plan.name}</h1><p>{plan.copy}</p></div><div className="detail-panel"><span className="eyebrow">PLAN OVERVIEW</span><h2>A considered approach, clearly explained.</h2><p>This plan profile is designed to give you a clear view of its key terms before you make a decision. Final eligibility, risks and conditions should be confirmed in the official plan documents.</p><div className="detail-facts"><div><span>Minimum investment</span><strong>{plan.min}</strong></div><div><span>Investment horizon</span><strong>{plan.term}</strong></div><div><span>Indicative range*</span><strong>{plan.range} p.a.</strong></div><div><span>Risk category</span><strong>Moderate</strong></div></div></div></div><aside className="detail-aside"><span className="eyebrow">YOUR NEXT STEP</span><h3>Take a closer look.</h3><p>Review the plan documents and speak with our team before investing.</p><div className="aside-divider"/><div className="aside-row"><span>Minimum amount</span><strong>{plan.min}</strong></div><div className="aside-row"><span>Term</span><strong>{plan.term}</strong></div><button className="primary-button full-button" onClick={() => notify('Plan enquiry will be available soon')}>Request plan details <Icon name="chevron" size={16}/></button><span className="small-legal">No investment is placed from this preview.</span></aside></div><div className="demo-note"><span className="demo-mark">i</span><span>*All ranges and risk labels are sample content and do not represent an offer, recommendation, or promised return.</span></div></>
}

function WalletPage({ notify }) {
  return <><PageHeading eyebrow="YOUR MONEY, IN ONE PLACE" title="Wallet" subtitle="Review your balance and recent transactions." action={<button className="secondary-button" onClick={() => notify('Deposit methods will be configured by Arvo')}>+ Add funds</button>}/><section className="wallet-overview"><div className="wallet-main-balance"><span className="eyebrow">AVAILABLE BALANCE</span><strong>₹18,450<span>.00</span></strong><p>Ready to use across your Arvo account.</p><div className="wallet-actions"><button className="primary-button" onClick={() => notify('Deposit setup is coming soon')}><Icon name="arrowDown" size={17}/> Deposit</button><button className="outline-button" onClick={() => notify('Internal transfer flow is coming soon')}><Icon name="swap" size={17}/> Transfer</button><button className="outline-button" onClick={() => notify('Withdrawal request flow is coming soon')}><Icon name="arrowUp" size={17}/> Withdraw</button></div></div><div className="wallet-mini"><div><span className="eyebrow">TOTAL INVESTED</span><strong>₹1,10,000</strong></div><div><span className="eyebrow">TOTAL EARNINGS</span><strong className="accent-text">₹18,450</strong></div></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">ACCOUNT HISTORY</span><h2>Transactions</h2></div><button className="filter-button" onClick={() => notify('Showing all recent transactions')}>All types⌄</button></div><TransactionList items={transactions}/></section><div className="demo-note"><span className="demo-mark">i</span><span>Balances and transactions are sample data for interface preview.</span></div></>
}

function TransactionList({ items }) {
  return <div className="transaction-list">{items.map((item, index) => <div className="transaction-row" key={`${item.title}-${index}`}><span className={`transaction-icon ${item.type}`}><Icon name={item.icon} size={18}/></span><div className="transaction-description"><strong>{item.title}</strong><span>{item.detail}</span></div><strong className={`transaction-amount ${item.type}`}>{item.amount}</strong></div>)}</div>
}

function ReferralPage({ onCopy }) {
  const levels = [{ name: 'Level 1', note: 'People you invite directly', rate: '5%', people: '03 members', color: 'level-green' }, { name: 'Level 2', note: 'Your network’s invitations', rate: '2%', people: '08 members', color: 'level-gold' }, { name: 'Level 3', note: 'The next circle in your network', rate: '1%', people: '14 members', color: 'level-blue' }]
  return <><PageHeading eyebrow="GROW TOGETHER" title="Your referral circle" subtitle="See your network and rewards across three levels."/><section className="referral-hero"><div className="referral-copy"><span className="eyebrow">YOUR INVITE CODE</span><h2>Good things are<br/>better shared.</h2><p>Invite someone to explore Arvo with you.</p><div className="invite-code"><span>ARVO-ALEX-24</span><button onClick={onCopy} aria-label="Copy invite code"><Icon name="copy" size={17}/></button></div></div><div className="referral-illustration"><div className="referral-ring ring-a"/><div className="referral-ring ring-b"/><div className="referral-center">A</div><span className="referral-node node-one">J</span><span className="referral-node node-two">M</span><span className="referral-node node-three">R</span><span className="referral-node node-four">S</span></div></section><section className="referral-stats"><div><span className="eyebrow">TOTAL NETWORK</span><strong>25</strong><span>across 3 levels</span></div><div><span className="eyebrow">TOTAL REWARDS</span><strong>₹4,250</strong><span>illustrative rewards</span></div><div><span className="eyebrow">THIS MONTH</span><strong className="accent-text">+ ₹750</strong><span>sample activity</span></div></section><section className="section-block"><div className="section-heading"><div><span className="eyebrow">THREE LEVELS</span><h2>Referral breakdown</h2></div></div><div className="level-list">{levels.map((level) => <div className="level-card" key={level.name}><span className={`level-icon ${level.color}`}><Icon name="users" size={19}/></span><div className="level-content"><strong>{level.name}</strong><span>{level.note}</span></div><div className="level-people"><strong>{level.people}</strong><span>network size</span></div><span className="level-rate">{level.rate}<small>sample</small></span></div>)}</div></section><div className="demo-note"><span className="demo-mark">i</span><span>Referral rates and member counts are illustrative. Final referral terms are set by the platform.</span></div></>
}

function ProfilePage({ onLogin, notify }) {
  return <><PageHeading eyebrow="YOUR ARVO ACCOUNT" title="Profile & verification" subtitle="Manage your details and keep your account current." action={<button className="secondary-button" onClick={onLogin}>Sign in</button>}/><section className="profile-card"><div className="profile-avatar">AS</div><div className="profile-details"><span className="eyebrow">ACCOUNT PREVIEW</span><h2>Alex Sharma</h2><p>alex.sharma@example.com · +91 98765 43210</p></div><button className="outline-button profile-edit" onClick={() => notify('Profile editing will be available soon')}>Edit profile</button></section><section className="verification-section"><div className="section-heading"><div><span className="eyebrow">ACCOUNT SECURITY</span><h2>Verification status</h2></div></div><div className="verification-list"><div className="verification-row"><span className="verification-icon verified"><Icon name="check" size={18}/></span><div><strong>Email address</strong><span>alex.sharma@example.com</span></div><span className="status-pill verified-pill">Verified</span></div><div className="verification-row"><span className="verification-icon pending"><Icon name="user" size={18}/></span><div><strong>Profile verification</strong><span>Complete your details to continue</span></div><button className="inline-link" onClick={() => notify('Profile verification flow is coming soon')}>Continue <Icon name="chevron" size={14}/></button></div><div className="verification-row"><span className="verification-icon pending"><Icon name="lock" size={18}/></span><div><strong>Mobile number</strong><span>Verify with a one-time password</span></div><button className="inline-link" onClick={onLogin}>Verify <Icon name="chevron" size={14}/></button></div></div></section><section className="profile-bottom-grid"><div className="preferences-card"><span className="eyebrow">PREFERENCES</span><h3>Your experience</h3><button className="preference-row" onClick={() => notify('Choose your preferred language in settings')}><span>Language</span><strong>English <Icon name="chevron" size={16}/></strong></button><button className="preference-row" onClick={() => notify('Theme selector is available in the top bar')}><span>Appearance</span><strong>{themes.find((item) => item.id === document.querySelector('.app-shell')?.dataset.theme)?.name} <Icon name="chevron" size={16}/></strong></button></div><div className="support-card"><span className="support-icon"><Icon name="help" size={19}/></span><div><span className="eyebrow">WE’RE HERE TO HELP</span><h3>Talk to Arvo</h3><p>Our concierge team is ready to answer your questions.</p><button className="inline-link" onClick={() => notify('Live chat will be available soon')}>Start a conversation <Icon name="chevron" size={14}/></button></div></div></section><div className="demo-note"><span className="demo-mark">i</span><span>Profile information is sample data for this interface preview.</span></div></>
}

export default App
