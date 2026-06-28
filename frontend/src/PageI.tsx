import { useRef, useState } from 'react'
import type { ArtworkSummary, VisitorProfile } from './types'

const MAX_PX = 1600
const JPEG_QUALITY = 0.85
const ONBOARDED_KEY = 'genz-museum-onboarded'

const AGE_OPTIONS = ['Enfant (-12 ans)', 'Ado (12-17 ans)', 'Adulte (18-64 ans)', 'Senior (65 ans et +)']
const LEVEL_OPTIONS = ['Novice', 'Amateur', 'Expert']
const INTEREST_OPTIONS = ['Histoire et contexte', 'Anecdotes insolites', 'Technique artistique', 'Symbolisme et interprétation']
const TONE_OPTIONS = ['Ludique', 'Sérieux']

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas vide'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

type NarrateState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'done' | 'error'

type State =
  | { status: 'onboarding' }
  | { status: 'idle' }
  | { status: 'loading'; preview: string }
  | { status: 'result'; preview: string; data: ArtworkSummary }
  | { status: 'error'; preview: string; message: string }

export default function PageI({ onArtistFound, onNewProfile, hidden }: {
  onArtistFound: (id: string) => void; onNewProfile: () => void; hidden: boolean
}) {
  const [state, setState] = useState<State>(() =>
    localStorage.getItem(ONBOARDED_KEY) ? { status: 'idle' } : { status: 'onboarding' },
  )
  const [narrateState, setNarrateState] = useState<NarrateState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handleFile(file: File) {
    const preview = URL.createObjectURL(file)
    setState({ status: 'loading', preview })
    const blob = await resizeImage(file)
    const form = new FormData()
    form.append('file', blob, 'photo.jpg')
    try {
      const res = await fetch('/analyze', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`)
      const data: ArtworkSummary = await res.json()
      if (data.artist_id && !data.in_session) onArtistFound(data.artist_id)
      setNarrateState('idle')
      setState({ status: 'result', preview, data })
      prefetchAudio(data)
    } catch (err) {
      setState({ status: 'error', preview, message: (err as Error).message })
    }
  }

  async function prefetchAudio(data: ArtworkSummary) {
    setNarrateState('loading')
    try {
      const res = await fetch('/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const audio = new Audio(URL.createObjectURL(blob))
      audio.onended = () => setNarrateState('done')
      audio.onerror = () => setNarrateState('error')
      audioRef.current = audio
      setNarrateState('ready')
    } catch {
      setNarrateState('error')
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return
    if (narrateState === 'playing') {
      audioRef.current.pause()
      setNarrateState('paused')
    } else {
      if (narrateState === 'done') audioRef.current.currentTime = 0
      audioRef.current.play()
      setNarrateState('playing')
    }
  }

  function reset() {
    audioRef.current?.pause()
    audioRef.current = null
    setNarrateState('idle')
    setState({ status: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  async function newProfile() {
    if (!confirm('Archiver la visite actuelle et créer un nouveau profil ?')) return
    try {
      await fetch('/new-profile', { method: 'POST' })
    } finally {
      onNewProfile()
      localStorage.removeItem(ONBOARDED_KEY)
      setState({ status: 'onboarding' })
    }
  }

  return (
    <div style={{ ...s.page, display: hidden ? 'none' : 'flex' }}>
      <h1 style={s.h1}>Scanner une œuvre</h1>

      {state.status === 'onboarding' && (
        <Onboarding onDone={() => { localStorage.setItem(ONBOARDED_KEY, '1'); setState({ status: 'idle' }) }} />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {state.status === 'idle' && (
        <div style={s.idleWrap}>
          <button style={s.cameraBtn} onClick={() => inputRef.current?.click()}>
            <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
              <path d="M9.5 4.5L8 7H3a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 3 22h22a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 25 7h-5l-1.5-2.5z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
              <circle cx="14" cy="14" r="4.5" stroke="#fff" strokeWidth="1.6"/>
              <circle cx="22.5" cy="9.5" r="1" fill="#fff"/>
            </svg>
          </button>
          <span style={s.cameraLabel}>Photographier</span>
          <button style={s.btnSecondary} onClick={newProfile}>Nouveau profil</button>
        </div>
      )}

      {state.status !== 'idle' && state.status !== 'onboarding' && (
        <img src={state.preview} alt="" style={s.preview} />
      )}

      {state.status === 'loading' && (
        <div style={s.spinnerWrap}>
          <div style={s.spinner} />
          <span style={s.dim}>Analyse en cours…</span>
        </div>
      )}

      {state.status === 'error' && (
        <>
          <p style={s.error}>{state.message}</p>
          <button style={s.btn} onClick={reset}>Réessayer</button>
        </>
      )}

      {state.status === 'result' && (
        <Result data={state.data} onReset={reset} narrateState={narrateState} onPlay={toggleAudio} />
      )}
    </div>
  )
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [ageRange, setAgeRange] = useState<string | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [tone, setTone] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = ageRange !== null && level !== null && tone !== null && !submitting

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    const profile: VisitorProfile = { age_range: ageRange!, level: level!, interests, tone: tone! }
    try {
      await fetch('/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    } finally {
      onDone()
    }
  }

  return (
    <div style={s.col}>
      <p style={s.dim}>Quelques questions pour adapter le guide à toi.</p>
      <Choice label="Ton âge" options={AGE_OPTIONS} value={ageRange} onChange={setAgeRange} />
      <Choice label="Ton niveau en art" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
      <MultiChoice label="Ce qui t'intéresse" options={INTEREST_OPTIONS} values={interests}
        onToggle={(i) => setInterests((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])} />
      <Choice label="Le ton que tu préfères" options={TONE_OPTIONS} value={tone} onChange={setTone} />
      <button style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.45 }} disabled={!canSubmit} onClick={submit}>
        {submitting ? 'Préparation…' : 'Commencer la visite'}
      </button>
    </div>
  )
}

function Choice({ label, options, value, onChange }: {
  label: string; options: string[]; value: string | null; onChange: (v: string) => void
}) {
  return (
    <div style={s.group}>
      <div style={s.groupLabel}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options.map((opt) => (
          <button key={opt} type="button"
            style={{ ...s.chip, ...(value === opt ? s.chipOn : {}) }}
            onClick={() => onChange(opt)}>{opt}</button>
        ))}
      </div>
    </div>
  )
}

function MultiChoice({ label, options, values, onToggle }: {
  label: string; options: string[]; values: string[]; onToggle: (v: string) => void
}) {
  return (
    <div style={s.group}>
      <div style={s.groupLabel}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options.map((opt) => (
          <button key={opt} type="button"
            style={{ ...s.chip, ...(values.includes(opt) ? s.chipOn : {}) }}
            onClick={() => onToggle(opt)}>{opt}</button>
        ))}
      </div>
    </div>
  )
}

const NARRATE_LABEL: Record<string, string> = {
  loading: 'Chargement…',
  ready: '▷  Écouter',
  playing: '⏸  Pause',
  paused: '▷  Reprendre',
  done: '↺  Réécouter',
  error: 'Narration indisponible',
}

const NARRATE_ACTIVE = new Set(['ready', 'playing', 'paused', 'done'])

function Result({ data, onReset, narrateState, onPlay }: {
  data: ArtworkSummary; onReset: () => void; narrateState: NarrateState; onPlay: () => void
}) {
  const canTap = NARRATE_ACTIVE.has(narrateState)
  return (
    <div style={s.col}>
      {narrateState !== 'idle' && (
        <button
          style={{
            ...s.audioBtn,
            opacity: canTap ? 1 : 0.45,
            color: canTap ? '#a67c2a' : '#1c1812',
            borderColor: canTap ? '#c9a84c66' : '#e4ddd3',
          }}
          disabled={!canTap}
          onClick={onPlay}
        >
          {NARRATE_LABEL[narrateState]}
        </button>
      )}
      <Card label="Titre" value={data.titre_probable ?? '—'} large />
      <Card label="Artiste" value={data.artiste_probable ?? '—'} large />
      <Card label="Style" value={data.style} />
      {data.epoque && <Card label="Époque" value={data.epoque} />}
      {data.technique && <Card label="Technique" value={data.technique} />}
      <Card label="Description" value={data.description} />
      <Card label="Ambiance" value={data.ambiance} />
      <Card label="Sujets"><Chips items={data.sujets} /></Card>
      <Card label="Couleurs dominantes">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
          {data.couleurs_dominantes.map((c) => (
            <span key={c} style={{ ...s.dot, background: c.toLowerCase(), border: '1px solid rgba(0,0,0,.1)' }} />
          ))}
        </div>
      </Card>
      <button style={{ ...s.btn, marginTop: 4 }} onClick={onReset}>Nouvelle photo</button>
    </div>
  )
}

function Card({ label, value, large, children }: {
  label: string; value?: string; large?: boolean; children?: React.ReactNode
}) {
  return (
    <div style={s.card}>
      <div style={s.cardLabel}>{label}</div>
      {value !== undefined && <div style={large ? s.cardLg : s.cardVal}>{value}</div>}
      {children}
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((t) => <span key={t} style={s.chip}>{t}</span>)}
    </div>
  )
}

const PLAYFAIR = "'Playfair Display', Georgia, serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"

const s = {
  page: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1.5rem', padding: '2rem 1.2rem 1rem', width: '100%', maxWidth: 500, margin: '0 auto' },
  col: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  h1: { fontFamily: PLAYFAIR, fontSize: '1.6rem', fontWeight: 400, letterSpacing: '.01em', color: '#1c1812' },

  idleWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', paddingTop: '1.5rem' },
  cameraBtn: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #c9a84c, #a67c2a)',
    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(166,124,42,.35)',
  },
  cameraLabel: { fontFamily: SANS, fontSize: '.65rem', letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#1c1812', opacity: 0.45 },
  btn: { background: '#1c1812', color: '#f7f4ef', border: 'none', borderRadius: 8, padding: '.85rem 2rem', fontSize: '.88rem', fontWeight: 600, letterSpacing: '.04em', cursor: 'pointer', width: '100%', maxWidth: 320, fontFamily: SANS },
  btnSecondary: { background: 'none', color: '#1c1812', border: 'none', fontSize: '.75rem', opacity: 0.35, cursor: 'pointer', textDecoration: 'underline' as const, fontFamily: SANS },
  audioBtn: { background: '#ffffff', border: '1px solid', borderRadius: 8, padding: '.65rem 1.4rem', fontSize: '.82rem', letterSpacing: '.05em', cursor: 'pointer', width: '100%', textAlign: 'center' as const, fontFamily: SANS, transition: 'color .15s, border-color .15s', boxShadow: '0 1px 4px rgba(0,0,0,.06)' },
  preview: { width: '100%', borderRadius: 10, objectFit: 'cover' as const, aspectRatio: '4/3' as const, boxShadow: '0 2px 16px rgba(0,0,0,.1)' },
  spinnerWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 14 },
  spinner: { width: 40, height: 40, border: '3px solid #e4ddd3', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin .8s linear infinite' },
  dim: { opacity: 0.45, fontSize: '.88rem', fontFamily: SANS, color: '#1c1812' },
  error: { color: '#c0392b', textAlign: 'center' as const, fontSize: '.9rem', fontFamily: SANS },

  card: { background: '#ffffff', border: '1px solid #e8e2d8', borderRadius: 10, padding: '1rem 1.2rem', boxShadow: '0 1px 4px rgba(0,0,0,.05)' },
  cardLabel: { fontFamily: PLAYFAIR, fontStyle: 'italic', fontSize: '.65rem', letterSpacing: '.1em', color: '#1c1812', opacity: 0.38, marginBottom: 5 },
  cardVal: { fontSize: '.95rem', lineHeight: 1.6, fontFamily: SANS, color: '#1c1812' },
  cardLg: { fontFamily: PLAYFAIR, fontSize: '1.25rem', fontWeight: 400, lineHeight: 1.35, color: '#1c1812' },

  group: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  groupLabel: { fontFamily: PLAYFAIR, fontStyle: 'italic', fontSize: '.7rem', letterSpacing: '.06em', color: '#1c1812', opacity: 0.5 },

  chip: { background: '#f0ece4', color: '#1c1812', border: '1px solid #e4ddd3', borderRadius: 6, padding: '5px 12px', fontSize: '.82rem', cursor: 'pointer', fontFamily: SANS },
  chipOn: { background: '#1c1812', color: '#f7f4ef', border: '1px solid #1c1812' },

  submitBtn: { width: '100%', background: '#1c1812', color: '#f7f4ef', border: 'none', borderRadius: 8, padding: '.9rem', fontSize: '.88rem', letterSpacing: '.06em', fontWeight: 600, cursor: 'pointer', fontFamily: SANS },

  dot: { width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'inline-block' },
} as const
