import React, { useEffect, useRef, useState } from 'react'
import ConfirmButton from './ConfirmButtons'
import { Button, Modal, PlatformaticIcon } from '@platformatic/ui-components'
import { DULLS_BACKGROUND_COLOR, ERROR_RED, MODAL_POPUP_V2, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'

import styles from './ActionSelector.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

export default function ActionSelector ({
  status,
  changeStatus = (newStatus) => {},
  onAbort = (currentStatus) => {},
  onConfirm = (currentStatus) => {}
}) {
  const [open, setOpen] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [modalOptions, setModalOptions] = useState({})

  const selectorRef = useRef(null)
  const optionsRef = useRef(null)

  useEffect(() => {
    if (open) {
      if (optionsRef.current) {
        const selectorRect = selectorRef.current.getBoundingClientRect()
        optionsRef.current.style.width = `${selectorRect.width - 20}px`
        optionsRef.current.style.left = `${selectorRect.x}px`
      }
    }
  }, [open])
  function onSelectorClick () {
    setOpen(!open)
  }
  function renderComponent () {
    let text = ''
    const options = []
    switch (status) {
      case 'new':
        text = 'What would you like to do with this recommendation?'
        options.push({
          label: 'I\'ll work on it',
          value: 'work',
          handleClick: () => {
            changeStatus('in_progress')
          }
        })

        options.push({
          label: 'Skip this recommendation',
          value: 'skip',
          handleClick: () => {
            changeStatus('skipped')
          }
        })
        break
    }
    return (
      <div className={`${styles.container} ${typographyStyles.desktopBodySmall}`}>
        {status === 'skipped' && (
          <div className={styles.skippedAction} onClick={() => changeStatus('in_progress')}>I have changed my mind. I will work on it</div>
        )}
        {status === 'in_progress' && (
          <ConfirmButton
            onAbort={() => {
              setShowConfirmation(true)
              setModalOptions({
                title: 'Abort Recommendation?',
                text: 'Are you sure you want to abort this recommendation?',
                type: 'abort',
                handleProceed: () => {
                  onAbort(status)
                  setShowConfirmation(false)
                }
              })
            }}
            onConfirm={() => {
              setShowConfirmation(true)
              setModalOptions({
                title: 'Complete Recommendation?',
                text: 'Have you completed all the necessary optimisation steps suggested by this Recommendation?',
                type: 'confirm',
                handleProceed: () => {
                  onConfirm(status)
                  setShowConfirmation(false)
                }
              })
            }}
          />
        )}
        {status === 'new' && (
          <div className={`${styles.selector} ${typographyStyles.desktopBodySmall}`} onClick={onSelectorClick} ref={selectorRef}>
            <div className={styles.header}>
              {text}
              <PlatformaticIcon internalOverHandling iconName={!open ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={RICH_BLACK} size={SMALL} />
            </div>
            {open && (
              <div className={styles.options} ref={optionsRef}>
                {options.map((opt, idx) => {
                  return <div key={idx} className={styles.option} onClick={() => opt.handleClick()}>{opt.label}</div>
                })}
              </div>
            )}
          </div>
        )}

      </div>
    )
  }
  return (
    <div>
      {renderComponent()}
      {showConfirmation && (
        <Modal
          key='recommendationActionConfirm'
          layout={MODAL_POPUP_V2}
          title={modalOptions.title}
          setIsOpen={setShowConfirmation}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <div className={`${styles.modalText} ${typographyStyles.desktopBodySmall}`}>
            <p>{modalOptions.text}</p>
            <p>This action is irreversible.</p>
          </div>

          <div className={styles.modalButtons}>
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.mediumButtonPadding}
              label='Cancel'
              onClick={() => { setShowConfirmation(false) }}
              color={WHITE}
              backgroundColor={RICH_BLACK}
              hoverEffect={DULLS_BACKGROUND_COLOR}
            />
            <Button
              type='button'
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.mediumButtonPadding}
              label={modalOptions.type === 'confirm' ? 'Confirm' : 'Abort'}
              bordered={false}
              onClick={modalOptions.handleProceed}
              color={modalOptions.type === 'confirm' ? RICH_BLACK : WHITE}
              backgroundColor={modalOptions.type === 'confirm' ? WHITE : ERROR_RED}
              hoverEffect={DULLS_BACKGROUND_COLOR}
            />
          </div>

        </Modal>
      )}

    </div>
  )
}
