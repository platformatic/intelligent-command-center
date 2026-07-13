import React from 'react'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { MAIN_GREEN, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import ConfidenceBar from './ConfidenceBar'
import styles from './SuggestionCard.module.css'

export default function SuggestionCard ({ suggestion, index, isSelected, onSelect, onAccept }) {
  if (suggestion.accepted) {
    return (
      <div className={styles.suggestionCard}>
        <div className={styles.acceptedState}>
          <div className={styles.checkmarkIcon}>
            <PlatformaticIcon iconName='CircleCheckMarkIcon' color={MAIN_GREEN} size={MEDIUM} />
          </div>
          <h3 className={styles.acceptedTitle}>Suggestion Accepted</h3>
          <p className={styles.acceptedSummary}>
            {suggestion.value} pods will be set {suggestion.details?.when || 'as scheduled'}
          </p>
        </div>
      </div>
    )
  }

  const confidence = suggestion.details?.confidence || 0
  const when = suggestion.details?.when || ''
  const timeSlot = when.includes(',') ? when.split(',')[1].trim() : when

  return (
    <div
      className={`${styles.suggestionCard} ${isSelected ? styles.suggestionCardSelected : ''}`}
      onClick={() => onSelect(isSelected ? null : suggestion)}
    >
      <div className={styles.suggestionTitleRow}>
        <div className={styles.suggestionTitleWithBar}>
          <div className={styles.suggestionTitle}>
            <div className={styles.suggestionIndicator} style={{ backgroundColor: '#1FD47D' }} />
            <span className={styles.suggestionTitleText}>
              Suggestion {timeSlot}
            </span>
          </div>
          {confidence > 0 && (
            <div className={styles.confidenceBar}>
              <ConfidenceBar confidence={confidence} />
            </div>
          )}
        </div>
        <button
          type='button'
          className={styles.acceptButton}
          onClick={(e) => {
            e.stopPropagation()
            onAccept(suggestion)
          }}
        >
          Accept
        </button>
      </div>

      <div className={styles.suggestionDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Action:</span>
          <span className={styles.detailValue}>
            set to {suggestion.value} pods
          </span>
        </div>

        {when && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>When:</span>
            <span className={styles.detailValue}>
              {when}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
