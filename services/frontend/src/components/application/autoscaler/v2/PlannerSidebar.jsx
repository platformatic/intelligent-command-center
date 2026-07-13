import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { PlatformaticIcon, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import callApi from '~/api/common'
import SuggestionCard from './SuggestionCard'
import styles from './PlannerSidebar.module.css'

const getSuggestionKey = (suggestion) => {
  const scopeKeysStr = suggestion.scopeKeys?.join(',') || ''
  return `${suggestion.slotOfDay}|${scopeKeysStr}`
}

function SuggestionsTab ({ appId, suggestionsCount, selectedSuggestion, onSelectSuggestion }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    callApi('scaler', `/applications/${appId}/suggestions`)
      .then(result => {
        const suggestions = result?.suggestions || []
        setSuggestions(Array.isArray(suggestions) ? suggestions : [])
        setLoading(false)
      })
      .catch(() => {
        setSuggestions([])
        setLoading(false)
      })
  }, [appId])

  if (loading) {
    return (
      <div className={styles.suggestionsContainer}>
        <LoadingSpinnerV2
          loading
          spinnerProps={{ size: 30, thickness: 2 }}
          applySentences={{
            containerClassName: `${styles.loadingSpinner}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading suggestions...'
            }]
          }}
        />
      </div>
    )
  }

  const handleAcceptSuggestion = (suggestion) => {
    const key = getSuggestionKey(suggestion)
    setAcceptedSuggestions(prev => new Set(prev).add(key))
  }

  return (
    <div className={styles.suggestionsContainer}>
      {suggestions.map((suggestion, index) => {
        const key = getSuggestionKey(suggestion)
        const suggestionWithAccepted = {
          ...suggestion,
          accepted: acceptedSuggestions.has(key)
        }
        const isSelected = selectedSuggestion && getSuggestionKey(selectedSuggestion) === key

        return (
          <SuggestionCard
            key={key || index}
            suggestion={suggestionWithAccepted}
            index={index}
            isSelected={isSelected}
            onSelect={onSelectSuggestion}
            onAccept={handleAcceptSuggestion}
          />
        )
      })}
      {!loading && suggestions.length === 0 && (
        <p className={styles.emptyState}>No suggestions available</p>
      )}
    </div>
  )
}

function ScheduledTab () {
  return (
    <div className={styles.scheduledContainer}>
      <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite70}`}>
        Scheduled events will appear here
      </p>
    </div>
  )
}

export default function PlannerSidebar ({ appId, isOpen, onClose, selectedSuggestion, onSelectSuggestion }) {
  const [activeTab, setActiveTab] = useState('suggestions')
  const [suggestionsCount, setSuggestionsCount] = useState(0)

  useEffect(() => {
    if (!appId || !isOpen) return
    callApi('scaler', `/applications/${appId}/suggestions`)
      .then(result => {
        const suggestions = result?.suggestions || []
        setSuggestionsCount(Array.isArray(suggestions) ? suggestions.length : 0)
      })
      .catch(() => setSuggestionsCount(0))
  }, [appId, isOpen])

  if (!isOpen) return null

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
            SUGGESTIONS ({suggestionsCount})
          </span>
        </button>
        <button
          type='button'
          className={`${styles.tab} ${activeTab === 'scheduled' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          <span className={typographyStyles.desktopOtherOverlineSmall}>
            SCHEDULED (0)
          </span>
        </button>
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'suggestions' && (
          <SuggestionsTab
            appId={appId}
            suggestionsCount={suggestionsCount}
            selectedSuggestion={selectedSuggestion}
            onSelectSuggestion={onSelectSuggestion}
          />
        )}
        {activeTab === 'scheduled' && <ScheduledTab />}
      </div>
    </div>
  )
}
