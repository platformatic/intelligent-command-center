import React from 'react'

import { Button, Modal } from '@platformatic/ui-components'
import { DULLS_BACKGROUND_COLOR, ERROR_RED, MODAL_POPUP_V2, RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'

import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './ConfirmationModal.module.css'
export default function ConfirmationModal ({
  title = '',
  text = <></>,
  type = 'confirm',
  buttonText = 'Continue',
  onProceed = () => {},
  setIsOpen = () => {}
}) {
  return (

    <Modal
      key='recommendationActionConfirm'
      layout={MODAL_POPUP_V2}
      title={title}
      setIsOpen={setIsOpen}
      childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
      modalCloseClassName={styles.modalCloseClassName}
      titleClassName={`${typographyStyles.textWhite} ${typographyStyles.desktopHeadline4}`}
    >
      <div className={styles.modal}>
        <div className={`${styles.modalText} ${typographyStyles.desktopBodySmall}`}>
          {text}
        </div>

        <div className={styles.modalButtons}>
          <Button
            type='button'
            textClass={typographyStyles.desktopBodySmallest}
            paddingClass={commonStyles.smallButtonPadding}
            label='Cancel'
            onClick={() => { setIsOpen(false) }}
            color={WHITE}
            backgroundColor={RICH_BLACK}
            hoverEffect={DULLS_BACKGROUND_COLOR}
          />
          <Button
            type='button'
            textClass={typographyStyles.desktopBodySmallest}
            paddingClass={commonStyles.smallButtonPadding}
            label={buttonText}
            bordered={false}
            onClick={onProceed}
            color={type === 'confirm' ? RICH_BLACK : WHITE}
            backgroundColor={type === 'confirm' ? WHITE : ERROR_RED}
            hoverEffect={DULLS_BACKGROUND_COLOR}
          />
        </div>
      </div>

    </Modal>

  )
}
