import React from 'react'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { MAIN_GREEN, MEDIUM, SMALL } from '@platformatic/ui-components/src/components/constants'
import ConfidenceBar from './ConfidenceBar'
import styles from './SuggestionCard.module.css'

// One card for both states — a candidate and an accepted suggestion are the same row, told apart by
// the server's `status` ('suggested' | 'active'). Accepted ones keep the whole layout (action, when,
// confidence) and swap the Accept button for Cancel, so the tab you are on never changes what you read.
//
// `confirmation` is the one exception: right after you accept, the card you clicked shows a short
// confirmation in place — otherwise it would simply vanish from the SUGGESTIONS tab with no feedback.
export default function SuggestionCard ({ suggestion, index, isSelected, busy, confirmation, onSelect, onAccept, onCancel }) {
  const accepted = suggestion.status === 'active'
  const confidence = suggestion.details?.confidence || 0
  const when = suggestion.details?.when || ''
  const timeSlot = when.includes(',') ? when.split(',')[1].trim() : when

  if (confirmation) {
    return (
      <div className={styles.suggestionCard}>
        <div className={styles.acceptedState}>
          <div className={styles.checkmarkIcon}>
            <PlatformaticIcon iconName='CircleCheckMarkIcon' color={MAIN_GREEN} size={MEDIUM} />
          </div>
          <h3 className={styles.acceptedTitle}>Suggestion Accepted</h3>
          <p className={styles.acceptedSummary}>
            {suggestion.value} pods will be set {when || 'as scheduled'}
          </p>
          <p className={styles.acceptedHint}>Find it under SCHEDULED</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.suggestionCard} ${isSelected ? styles.suggestionCardSelected : ''}`}
      // Stop the click here: the planner clears the selection on any click that reaches it, so a card
      // click must not bubble up and immediately undo the selection it just made.
      onClick={(e) => {
        e.stopPropagation()
        onSelect(isSelected ? null : suggestion)
      }}
    >
      <div className={styles.suggestionTitleRow}>
        <div className={styles.suggestionTitleWithBar}>
          <div className={styles.suggestionTitle}>
            {accepted
              ? (
                <div className={styles.checkmarkIcon}>
                  <PlatformaticIcon iconName='CircleCheckMarkIcon' color={MAIN_GREEN} size={SMALL} />
                </div>
                )
              : <div className={styles.suggestionIndicator} style={{ backgroundColor: '#1FD47D' }} />}
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
        {accepted
          ? (
            <button
              type='button'
              className={styles.cancelButton}
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                onCancel(suggestion)
              }}
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
            )
          : (
            <button
              type='button'
              className={styles.acceptButton}
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                onAccept(suggestion)
              }}
            >
              {busy ? 'Accepting…' : 'Accept'}
            </button>
            )}
      </div>

      <div className={styles.suggestionDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Action:</span>
          <span className={styles.detailValue}>
            {accepted ? 'set' : 'set to'} {suggestion.value} pods
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

        {accepted && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Until:</span>
            <span className={styles.detailValue}>
              {suggestion.until
                ? new Date(suggestion.until).toLocaleDateString()
                : 'Recurring — no end date'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
