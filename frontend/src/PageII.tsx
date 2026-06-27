import { useState } from 'react'
import { MUSEUMS, MAX_SCANS, getLevel, museumProgress } from './data'

const PROGRESS_KEY = 'genz-museum-progress'

function getProgress(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') }
  catch { return {} }
}

// ─── Ring SVG ───────────────────────────────────────────────────────────────

function Ring({ progress, size, color, bg = '#222' }: {
  progress: number; size: number; color: string; bg?: string
}) {
  const stroke = 5
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2
  return (
    <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', zIndex: 2 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
      {progress > 0 && (
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${circ}`} strokeDashoffset={`${circ * (1 - progress)}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }} />
      )}
    </svg>
  )
}

// ─── Museum list ─────────────────────────────────────────────────────────────

export default function PageII() {
  const [selectedMuseum, setSelectedMuseum] = useState<string | null>(null)
  const scans = getProgress()

  if (selectedMuseum) {
    const museum = MUSEUMS.find((m) => m.id === selectedMuseum)!
    return <MuseumDetail museum={museum} scans={scans} onBack={() => setSelectedMuseum(null)} />
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Collection</h1>
      <p style={s.sub}>Scanne des œuvres pour débloquer les artistes</p>

      <div style={s.museumList}>
        {MUSEUMS.map((m, i) => {
          const prog = museumProgress(m.id, scans)
          const unlockedCount = m.artists.filter((a) => (scans[a.id] ?? 0) > 0).length
          const totalScans = m.artists.reduce((sum, a) => sum + Math.min(scans[a.id] ?? 0, MAX_SCANS), 0)
          const isLast = i === MUSEUMS.length - 1

          return (
            <div key={m.id} style={s.row}>
              {/* Node + connector */}
              <div style={s.connectorCol}>
                <button
                  style={{ ...s.node, borderColor: prog > 0 ? m.color : '#2a2a2a' }}
                  onClick={() => setSelectedMuseum(m.id)}
                >
                  <Ring progress={prog} size={72} color={m.color} bg="#1a1a1a" />
                  <div style={s.nodeInner}>
                    <span style={s.nodeIcon}>{m.icon}</span>
                    <span style={{ ...s.nodePct, color: prog > 0 ? m.color : '#444' }}>
                      {Math.round(prog * 100)}%
                    </span>
                  </div>
                </button>
                {!isLast && <div style={{ ...s.line, background: prog > 0 ? m.color + '55' : '#222' }} />}
              </div>

              {/* Museum card */}
              <button style={s.museumCard} onClick={() => setSelectedMuseum(m.id)}>
                <div style={{ ...s.museumName, color: prog > 0 ? m.color : '#ccc' }}>{m.name}</div>
                <div style={s.museumLocation}>{m.location}</div>
                <div style={s.museumTheme}>{m.theme}</div>
                <div style={s.museumStats}>
                  {unlockedCount > 0
                    ? `${unlockedCount}/${m.artists.length} artistes · ${totalScans} scan${totalScans !== 1 ? 's' : ''}`
                    : `${m.artists.length} artistes à découvrir`}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Museum Detail ────────────────────────────────────────────────────────────

function MuseumDetail({ museum, scans, onBack }: {
  museum: typeof MUSEUMS[0]
  scans: Record<string, number>
  onBack: () => void
}) {
  const prog = museumProgress(museum.id, scans)
  const unlockedCount = museum.artists.filter((a) => (scans[a.id] ?? 0) > 0).length

  return (
    <div style={s.page}>
      <button style={s.back} onClick={onBack}>← Retour</button>

      <div style={s.museumHeader}>
        <span style={s.headerIcon}>{museum.icon}</span>
        <div>
          <h2 style={{ ...s.h1, color: museum.color }}>{museum.name}</h2>
          <p style={s.sub}>{museum.location} · {museum.theme}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={s.progressWrap}>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${prog * 100}%`, background: museum.color }} />
        </div>
        <div style={s.progressMeta}>
          <span style={{ color: museum.color }}>{Math.round(prog * 100)}% exploré</span>
          <span style={s.progressSub}>{unlockedCount}/{museum.artists.length} artistes débloqués</span>
        </div>
      </div>

      {/* Artist grid */}
      <div style={s.artistGrid}>
        {museum.artists.map((artist) => {
          const n = Math.min(scans[artist.id] ?? 0, MAX_SCANS)
          const unlocked = n > 0

          return (
            <div key={artist.id} style={{
              ...s.artistCard,
              border: `1px solid ${unlocked ? museum.color + '44' : '#222'}`,
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative', width: 84, height: 84 }}>
                <Ring progress={n / MAX_SCANS} size={84} color={museum.color} bg="#1a1a1a" />
                <div style={{
                  ...s.avatarWrap,
                  filter: unlocked ? 'none' : 'grayscale(1) brightness(0.35)',
                }}>
                  <img
                    src={artist.portrait}
                    alt={artist.name}
                    style={s.portrait}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const sib = e.currentTarget.nextElementSibling as HTMLElement | null
                      if (sib) sib.style.display = 'flex'
                    }}
                  />
                  <div style={{ ...s.initialsWrap, display: 'none', color: unlocked ? museum.color : '#444' }}>
                    {artist.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                </div>
              </div>

              <div style={{ ...s.artistName, color: unlocked ? '#f0f0f0' : '#555' }}>{artist.name}</div>
              <div style={s.artistDates}>{artist.dates}</div>

              <div style={{
                ...s.levelBadge,
                background: unlocked ? museum.color + '22' : '#1a1a1a',
                color: unlocked ? museum.color : '#444',
                borderColor: unlocked ? museum.color + '55' : '#222',
              }}>
                {n === MAX_SCANS ? '✦ ' : ''}{getLevel(n)}
              </div>

              {n > 0 && n < MAX_SCANS && (
                <div style={s.dots}>
                  {Array.from({ length: MAX_SCANS }).map((_, i) => (
                    <span key={i} style={{ ...s.dot, background: i < n ? museum.color : '#333' }} />
                  ))}
                </div>
              )}

              <div style={{ ...s.knownFor, color: unlocked ? '#777' : '#444' }}>{artist.known_for}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  page: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', padding: '2rem 1.2rem 1rem', width: '100%', maxWidth: 500, margin: '0 auto' },
  h1: { fontSize: '1.4rem', fontWeight: 700, letterSpacing: '.02em', margin: 0 },
  sub: { fontSize: '.82rem', opacity: 0.4, margin: 0 },
  back: { alignSelf: 'flex-start', background: 'none', border: 'none', color: '#888', fontSize: '.9rem', cursor: 'pointer', padding: 0 },

  museumHeader: { display: 'flex', alignItems: 'center', gap: 14, alignSelf: 'flex-start' },
  headerIcon: { fontSize: '2.2rem', lineHeight: 1 },

  museumList: { width: '100%', display: 'flex', flexDirection: 'column' as const },
  row: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  connectorCol: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', flexShrink: 0 },
  node: { position: 'relative' as const, width: 72, height: 72, borderRadius: '50%', background: '#111', border: '2px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  nodeInner: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 1, position: 'relative' as const, zIndex: 3 },
  nodeIcon: { fontSize: '1.3rem', lineHeight: 1 },
  nodePct: { fontSize: '.6rem', fontWeight: 700 },
  line: { width: 2, height: 28, marginTop: 4, marginBottom: 4 },

  museumCard: { flex: 1, background: '#1a1a1a', border: 'none', borderRadius: 14, padding: '.85rem 1rem', cursor: 'pointer', textAlign: 'left' as const, marginBottom: 8 },
  museumName: { fontSize: '.95rem', fontWeight: 700, marginBottom: 2 },
  museumLocation: { fontSize: '.72rem', opacity: 0.5, marginBottom: 2 },
  museumTheme: { fontSize: '.72rem', opacity: 0.4, marginBottom: 4 },
  museumStats: { fontSize: '.7rem', opacity: 0.35 },

  progressWrap: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 6 },
  progressTrack: { height: 5, background: '#222', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width .6s ease' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '.72rem' },
  progressSub: { opacity: 0.4 },

  artistGrid: { width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  artistCard: { background: '#141414', borderRadius: 16, padding: '1.1rem .8rem', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 5 },
  avatarWrap: { position: 'absolute' as const, inset: 6, borderRadius: '50%', overflow: 'hidden', background: '#1a1a1a' },
  portrait: { width: '100%', height: '100%', objectFit: 'cover' as const, display: 'block' },
  initialsWrap: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 },
  artistName: { fontSize: '.82rem', fontWeight: 600, textAlign: 'center' as const, marginTop: 2, lineHeight: 1.3 },
  artistDates: { fontSize: '.65rem', opacity: 0.3 },
  levelBadge: { fontSize: '.68rem', fontWeight: 600, padding: '3px 9px', borderRadius: 20, border: '1px solid', marginTop: 2 },
  dots: { display: 'flex', gap: 3, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: '50%' },
  knownFor: { fontSize: '.62rem', textAlign: 'center' as const, fontStyle: 'italic', lineHeight: 1.4, marginTop: 2 },
} as const
