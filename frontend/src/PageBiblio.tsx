import { useEffect, useRef, useState } from 'react'
import { MUSEUMS, getArtistById } from './data'

type LibraryAudioMode = 'narrate' | 'immersive'

interface LibraryItem {
  phash: string
  titre: string | null
  artiste: string | null
  artist_id: string | null
  has_photo: boolean
  has_narration: boolean
  has_immersive: boolean
  has_audio: boolean
  audio_mode: 'narrate' | 'immersive' | null
}

export default function PageBiblio() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState<{ phash: string; mode: LibraryAudioMode } | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/library')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handlePlay(item: LibraryItem, mode: LibraryAudioMode) {
    if (playing?.phash === item.phash && playing.mode === mode) {
      audioRef.current?.pause()
      setPlaying(null)
      return
    }
    audioRef.current?.pause()
    setPlaying({ phash: item.phash, mode })
    setIsLoadingAudio(true)
    const endpoint = mode === 'immersive' ? '/immersive-audio' : '/audio'
    const audio = new Audio(`${endpoint}/${item.phash}`)
    audioRef.current = audio
    audio.oncanplaythrough = () => setIsLoadingAudio(false)
    audio.onended = () => setPlaying(null)
    audio.onerror = () => { setPlaying(null); setIsLoadingAudio(false) }
    audio.play().catch(() => { setPlaying(null); setIsLoadingAudio(false) })
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

  // Grouper par musée
  const museumGroups = MUSEUMS
    .map((m) => ({
      museum: m,
      items: items.filter((item) => getArtistById(item.artist_id || '')?.museum.id === m.id),
    }))
    .filter((g) => g.items.length > 0)

  const unknownItems = items.filter(
    (item) => !getArtistById(item.artist_id || ''),
  )

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Bibliothèque</h1>
      <p style={s.sub}>{items.length} œuvre{items.length > 1 ? 's' : ''}</p>

      {museumGroups.map(({ museum, items: groupItems }) => (
        <div key={museum.id} style={s.section}>
          <div style={s.sectionHeader}>
            <span style={{ ...s.sectionDot, background: museum.color }} />
            <span style={{ ...s.sectionName, color: museum.color }}>{museum.name}</span>
            <span style={s.sectionCount}>{groupItems.length}</span>
          </div>
          <div style={s.list}>
            {groupItems.map((item) => (
              <ArtworkRow
                key={item.phash}
                item={item}
                playingMode={playing?.phash === item.phash ? playing.mode : null}
                isLoadingAudio={isLoadingAudio}
                accentColor={museum.color}
                onPlay={handlePlay}
              />
            ))}
          </div>
        </div>
      ))}

      {unknownItems.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={{ ...s.sectionDot, background: '#c0b8af' }} />
            <span style={{ ...s.sectionName, color: '#8a8078' }}>Autres</span>
            <span style={s.sectionCount}>{unknownItems.length}</span>
          </div>
          <div style={s.list}>
            {unknownItems.map((item) => (
              <ArtworkRow
                key={item.phash}
                item={item}
                playingMode={playing?.phash === item.phash ? playing.mode : null}
                isLoadingAudio={isLoadingAudio}
                accentColor="#8a8078"
                onPlay={handlePlay}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ArtworkRow({ item, playingMode, isLoadingAudio, accentColor, onPlay }: {
  item: LibraryItem
  playingMode: LibraryAudioMode | null
  isLoadingAudio: boolean
  accentColor: string
  onPlay: (item: LibraryItem, mode: LibraryAudioMode) => void
}) {
  const active = playingMode !== null
  return (
    <div style={{ ...s.item, borderColor: active ? accentColor + '66' : '#e8e2d8' }}>
      {item.has_photo
        ? <img src={`/photos/${item.phash}`} alt="" style={s.thumb} />
        : <div style={s.thumbFallback}>◆</div>}

      <div style={s.info}>
        <div style={s.titre}>{item.titre ?? '—'}</div>
        <div style={s.artiste}>{item.artiste ?? '—'}</div>
      </div>

      {item.has_audio && (
        <div style={s.audioActions}>
          {item.has_narration && (
            <LibraryAudioButton
              label="Guide"
              active={playingMode === 'narrate'}
              loading={playingMode === 'narrate' && isLoadingAudio}
              accentColor={accentColor}
              onClick={() => onPlay(item, 'narrate')}
            />
          )}
          {item.has_immersive && (
            <LibraryAudioButton
              label="Scène"
              active={playingMode === 'immersive'}
              loading={playingMode === 'immersive' && isLoadingAudio}
              accentColor={accentColor}
              onClick={() => onPlay(item, 'immersive')}
            />
          )}
        </div>
      )}
    </div>
  )
}

function LibraryAudioButton({ label, active, loading, accentColor, onClick }: {
  label: string
  active: boolean
  loading: boolean
  accentColor: string
  onClick: () => void
}) {
  return (
    <button
      style={{
        ...s.playBtn,
        color: active ? '#fff' : '#1c1812',
        background: active ? accentColor : 'transparent',
        border: active ? '1px solid transparent' : '1px solid #e4ddd3',
      }}
      onClick={onClick}
    >
      <span style={{ fontSize: '.65rem', opacity: active ? 1 : 0.6 }}>
        {loading ? '…' : active ? '⏸' : '▷'} {label}
      </span>
    </button>
  )
}

const PLAYFAIR = "'Playfair Display', Georgia, serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif"

const s = {
  page: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1.5rem', padding: '2rem 1.2rem 1rem', width: '100%', maxWidth: 500, margin: '0 auto', color: '#1c1812' },
  h1: { fontFamily: PLAYFAIR, fontSize: '1.5rem', fontWeight: 400, color: '#1c1812' },
  sub: { fontFamily: SANS, fontSize: '.78rem', color: '#1c1812', opacity: 0.35, marginTop: -8 },
  empty: { fontFamily: SANS, color: '#1c1812', opacity: 0.3, fontSize: '.88rem', textAlign: 'center' as const, marginTop: '4rem' },
  spinner: { width: 32, height: 32, border: '2px solid #e4ddd3', borderTopColor: '#c9a84c', borderRadius: '50%', animation: 'spin .8s linear infinite', marginTop: '4rem' },

  section: { width: '100%', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 },
  sectionDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  sectionName: { fontFamily: PLAYFAIR, fontSize: '.88rem', fontWeight: 400, flex: 1 },
  sectionCount: { fontFamily: SANS, fontSize: '.7rem', color: '#1c1812', opacity: 0.35 },

  list: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  item: { display: 'flex', alignItems: 'center', gap: 12, background: '#ffffff', borderRadius: 10, padding: 10, border: '1px solid', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)', transition: 'border-color .2s' },

  thumb: { width: 52, height: 52, objectFit: 'cover' as const, borderRadius: 7, flexShrink: 0 },
  thumbFallback: { width: 52, height: 52, background: '#f0ece4', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', flexShrink: 0, color: '#d4cdc5' },

  info: { flex: 1, minWidth: 0 },
  titre: { fontFamily: PLAYFAIR, fontSize: '.9rem', fontWeight: 400, color: '#1c1812', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  artiste: { fontFamily: SANS, fontSize: '.7rem', color: '#1c1812', opacity: 0.4, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },

  audioActions: { display: 'flex', flexDirection: 'column' as const, gap: 4, flexShrink: 0 },
  playBtn: { width: 64, height: 27, borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s, border .15s', fontFamily: SANS },
} as const
