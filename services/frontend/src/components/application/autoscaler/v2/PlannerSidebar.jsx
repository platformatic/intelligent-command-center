import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import { PlatformaticIcon, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { MAIN_GREEN, MEDIUM, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import callApi from '~/api/common'
import ConfidenceBar from './ConfidenceBar'
import styles from './PlannerSidebar.module.css'

function SuggestionsTab ({ appId, suggestionsCount }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    callApi('scaler', `/applications/${appId}/suggestions`)
      .then(result => {
        const groups = result?.groups || []
        setSuggestions(Array.isArray(groups) ? groups : [])
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

  const handleAcceptSuggestion = (suggestionId, index) => {
    setAcceptedSuggestions(prev => new Set(prev).add(suggestionId || index))
  }

  const renderCardContent = (suggestion, index) => {
    const isAccepted = acceptedSuggestions.has(suggestion.id || index)

    if (isAccepted) {
      return (
        <div className={styles.acceptedState}>
          <div className={styles.checkmarkIcon}>
            <PlatformaticIcon iconName='CircleCheckMarkIcon' color={MAIN_GREEN} size={MEDIUM} />
          </div>
          <h3 className={styles.acceptedTitle}>Suggestion Accepted</h3>
          <p className={styles.acceptedSummary}>
            {suggestion.pods} pods will be set {suggestion.when || 'as scheduled'}
          </p>
        </div>
      )
    }

    return (
      <>
        <div className={styles.suggestionTitleRow}>
          <div className={styles.suggestionTitleWithBar}>
            <div className={styles.suggestionTitle}>
              <div className={styles.suggestionIndicator} style={{ backgroundColor: suggestion.color || '#1FD47D' }} />
              <span className={styles.suggestionTitleText}>
                #{index + 1} {suggestion.title || 'New Suggestion'}
              </span>
            </div>
            {suggestion.confidence && (
              <div className={styles.confidenceBar}>
                <ConfidenceBar confidence={suggestion.confidence} />
              </div>
            )}
          </div>
          <button
            type='button'
            className={styles.acceptButton}
            onClick={() => handleAcceptSuggestion(suggestion.id, index)}
          >
            Accept
          </button>
        </div>

        <div className={styles.suggestionDetails}>
          {suggestion.pods && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Action:</span>
              <span className={styles.detailValue}>
                set to {suggestion.pods} pods
              </span>
            </div>
          )}

          {suggestion.action && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Action:</span>
              <span className={styles.detailValue}>
                {suggestion.action}
              </span>
            </div>
          )}

          {suggestion.when && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>When:</span>
              <span className={styles.detailValue}>
                {suggestion.when}
              </span>
            </div>
          )}

          {(suggestion.action || suggestion.when) && (
            <button
              type='button'
              className={styles.showContextButton}
            >
              <span className={styles.showContextText}>
                Show Context
              </span>
              <PlatformaticIcon iconName='ArrowDownIcon' color={WHITE} size={SMALL} />
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className={styles.suggestionsContainer}>
      {suggestions.map((suggestion, index) => (
        <div key={suggestion.id || index} className={styles.suggestionCard}>
          {renderCardContent(suggestion, index)}
        </div>
      ))}
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

export default function PlannerSidebar ({ appId, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('suggestions')
  const [suggestionsCount, setSuggestionsCount] = useState(0)

  useEffect(() => {
    if (!appId || !isOpen) return
    callApi('scaler', `/applications/${appId}/suggestions`)
      .then(result => {
        const groups = result?.groups || []
        setSuggestionsCount(Array.isArray(groups) ? groups.length : 0)
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
        {activeTab === 'suggestions' && <SuggestionsTab appId={appId} suggestionsCount={suggestionsCount} />}
        {activeTab === 'scheduled' && <ScheduledTab />}
      </div>
    </div>
  )
}
