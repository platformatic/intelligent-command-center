import React, { useCallback, useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { PlatformaticIcon, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { getSuggestions, acceptSuggestion, cancelSuggestion } from '~/api/autoscaler'
import SuggestionCard from './SuggestionCard'
import styles from './PlannerSidebar.module.css'

function Spinner ({ text }) {
  return (
    <LoadingSpinnerV2
      loading
      spinnerProps={{ size: 30, thickness: 2 }}
      applySentences={{
        containerClassName: `${styles.loadingSpinner}`,
        sentences: [{
          style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
          text
        }]
      }}
    />
  )
}

// Both tabs are the same list of cards over the same rows — SUGGESTIONS holds the candidates
// (status 'suggested'), SCHEDULED holds the ones you accepted (status 'active'). The card renders
// itself from `status`, so accepting a suggestion moves it from one tab to the other.
function SuggestionList ({ suggestions, loading, busyId, confirmingId, emptyText, loadingText, selectedSuggestion, onSelectSuggestion, onAccept, onCancel }) {
  if (loading) {
    return (
      <div className={styles.suggestionsContainer}>
        <Spinner text={loadingText} />
      </div>
    )
  }

  return (
    <div className={styles.suggestionsContainer}>
      {suggestions.map((suggestion, index) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          index={index}
          isSelected={selectedSuggestion?.id === suggestion.id}
          busy={busyId === suggestion.id}
          confirmation={confirmingId === suggestion.id}
          onSelect={onSelectSuggestion}
          onAccept={onAccept}
          onCancel={onCancel}
        />
      ))}
      {suggestions.length === 0 && (
        <p className={styles.emptyState}>{emptyText}</p>
      )}
    </div>
  )
}

export default function PlannerSidebar ({ appId, isOpen, onClose, selectedSuggestion, onSelectSuggestion, onChange }) {
  const [activeTab, setActiveTab] = useState('suggestions')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  // One list holds both: candidates and accepted rows come back together, told apart by `status`.
  //
  // `quiet` skips the spinner: the refetch after accept/cancel would otherwise blank the whole list and
  // flash a loading label in the middle of the sidebar. The button's own busy state is feedback enough.
  const reload = useCallback(async ({ quiet = false } = {}) => {
    if (!appId) return
    if (!quiet) setLoading(true)
    setSuggestions(await getSuggestions(appId))
    if (!quiet) setLoading(false)
  }, [appId])

  useEffect(() => {
    if (!isOpen) return
    reload()
  }, [isOpen, reload])

  // The confirmation is transient — it holds the just-accepted card in place for a beat, then the card
  // settles into the SCHEDULED tab where it lives from then on.
  useEffect(() => {
    if (!confirmingId) return
    const timer = setTimeout(() => setConfirmingId(null), 2500)
    return () => clearTimeout(timer)
  }, [confirmingId])

  const mutate = async (suggestion, action, { confirm = false } = {}) => {
    setBusyId(suggestion.id)
    try {
      // Accept COPIES the candidate into a new active row and returns IT — so the row to confirm on is
      // the one the server hands back, not the candidate we clicked (which the list now hides).
      const accepted = await action(appId, suggestion.id)
      await reload({ quiet: true })
      if (confirm) setConfirmingId(accepted.id)
      onChange?.()
    } catch (error) {
      console.error('Failed to update suggestion', error)
    } finally {
      setBusyId(null)
    }
  }

  if (!isOpen) return null

  // The just-accepted row is 'active' now, but it stays in the SUGGESTIONS list until its confirmation
  // clears — otherwise it would vanish the instant you clicked, with no feedback at all.
  const candidates = suggestions.filter(s => s.status === 'suggested' || s.id === confirmingId)
  const accepted = suggestions.filter(s => s.status === 'active' && s.id !== confirmingId)

  return (
    <div className={styles.sidebar}>
      {/* Header with close button */}
      <div className={styles.sidebarHeader}>
        <h2 className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>
          Suggestions & Scheduled Actions
        </h2>
        <button
          type='button'
          className={styles.closeButton}
          onClick={onClose}
          aria-label='Close sidebar'
        >
          <PlatformaticIcon iconName='CloseIcon' color={WHITE} size={SMALL} />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type='button'
          className={`${styles.tab} ${activeTab === 'suggestions' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          <span className={typographyStyles.desktopOtherOverlineSmall}>
            SUGGESTIONS ({candidates.length})
          </span>
        </button>
        <button
          type='button'
          className={`${styles.tab} ${activeTab === 'scheduled' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          <span className={typographyStyles.desktopOtherOverlineSmall}>
            SCHEDULED ({accepted.length})
          </span>
        </button>
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        <SuggestionList
          suggestions={activeTab === 'suggestions' ? candidates : accepted}
          loading={loading}
          busyId={busyId}
          confirmingId={confirmingId}
          loadingText={activeTab === 'suggestions' ? 'Loading suggestions...' : 'Loading scheduled events...'}
          emptyText={activeTab === 'suggestions' ? 'No suggestions available' : 'No accepted suggestions yet'}
          selectedSuggestion={selectedSuggestion}
          onSelectSuggestion={onSelectSuggestion}
          onAccept={(suggestion) => mutate(suggestion, acceptSuggestion, { confirm: true })}
          onCancel={(suggestion) => mutate(suggestion, cancelSuggestion)}
        />
      </div>
    </div>
  )
}
