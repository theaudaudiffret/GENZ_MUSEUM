import { useEffect, useRef, useState } from 'react'

interface LibraryItem {
  phash: string
  titre: string | null
  artiste: string | null
  has_photo: boolean
  has_audio: boolean
}

export default function PageBiblio() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [playingPhash, setPlayingPhash] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/library')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handlePlay(phash: string) {
    // Pause si même item en cours
    if (playingPhash === phash) {
      audioRef.current?.pause()
      setPlayingPhash(null)
      return
    }

    // Arrêter l'audio précédent
    audioRef.current?.pause()
    setPlayingPhash(phash)
    setIsLoading(true)

    const audio = new Audio(`/audio/${phash}`)
    audioRef.current = audio
    audio.oncanplaythrough = () => setIsLoading(false)
    audio.onended = () => setPlayingPhash(null)
    audio.onerror = () => { setPlayingPhash(null); setIsLoading(false) }
    audio.play().catch(() => { setPlayingPhash(null); setIsLoading(false) })
  }

  if (loading) {
    return (
      <div style={s.page}>
        <h1 style={s.h1}>Bibliothèque</h1>
        <div style={s.spinner} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={s.page}>
        <h1 style={s.h1}>Bibliothèque</h1>
        <p style={s.empty}>Aucune œuvre scannée pour l'instant.</p>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Bibliothèque</h1>
      <p style={s.sub}>{items.length} œuvre{items.length > 1 ? 's' : ''}</p>

      <div style={s.list}>
        {items.map((item) => {
          const active = playingPhash === item.phash

          return (
            <div key={item.phash} style={{ ...s.item, borderColor: active ? '#fff3' : '#1f1f1f' }}>
              {/* Miniature */}
              {item.has_photo
                ? <img src={`/photos/${item.phash}`} alt="" style={s.thumb} />
                : <div style={s.thumbFallback}>🎨</div>}

              {/* Titre + artiste */}
              <div style={s.info}>
                <div style={s.titre}>{item.titre ?? '—'}</div>
                <div style={s.artiste}>{item.artiste ?? '—'}</div>
              </div>

              {/* Bouton audio */}
              {item.has_audio && (
                <button style={{ ...s.playBtn, background: active ? '#fff' : '#2a2a2a' }} onClick={() => handlePlay(item.phash)}>
                  <span style={{ color: active ? '#111' : '#f0f0f0', fontSize: '.9rem' }}>
                    {active && isLoading ? '⏳' : active ? '⏸' : '▶'}
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', padding: '2rem 1.2rem 1rem', width: '100%', maxWidth: 500, margin: '0 auto' },
  h1: { fontSize: '1.4rem', fontWeight: 700, letterSpacing: '.02em' },
  sub: { fontSize: '.82rem', opacity: 0.4, marginTop: -8 },
  empty: { opacity: 0.35, fontSize: '.9rem', textAlign: 'center' as const, marginTop: '4rem' },
  spinner: { width: 36, height: 36, border: '3px solid #222', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite', marginTop: '4rem' },

  list: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  item: { display: 'flex', alignItems: 'center', gap: 12, background: '#1a1a1a', borderRadius: 14, padding: 10, border: '1px solid', overflow: 'hidden' },

  thumb: { width: 60, height: 60, objectFit: 'cover' as const, borderRadius: 9, flexShrink: 0 },
  thumbFallback: { width: 60, height: 60, background: '#222', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 },

  info: { flex: 1, minWidth: 0 },
  titre: { fontSize: '.88rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  artiste: { fontSize: '.72rem', opacity: 0.45, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },

  playBtn: { width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s' },
} as const
