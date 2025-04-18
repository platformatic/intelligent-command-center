import React, { useEffect, useState } from 'react'
import {
  WHITE,
  RICH_BLACK,
  DULLS_BACKGROUND_COLOR,
  TRANSPARENT,
  MODAL_POPUP_V2
} from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { LoadingSpinnerV2, Button, Modal } from '@platformatic/ui-components'
import styles from './Exporting.module.css'
import SuccessComponent from '~/components/success/SuccessComponent'
import { callApiGetSync } from '~/api'

const TIMEOUT_AFTER_SUCCESS = 2000

function Importing ({
  config,
  onComplete = () => {},
  onCanceled = () => {},
  onError = () => {}
}) {
  const { target } = config

  const [innerLoading, setInnerLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [triggerReturn, setTriggerReturn] = useState(false)

  const onExport = () => {
    setImporting(true)
    setInnerLoading(true)
  }

  useEffect(() => {
    async function importData () {
      try {
        await callApiGetSync()
        setImporting(false)
        setInnerLoading(false)
        setShowSuccess(true)
        setTriggerReturn(true)
      } catch (error) {
        onError(error)
      }
    }
    if (importing) {
      importData()
    }
  }, [importing])

  useEffect(() => {
    if (triggerReturn) {
      setTimeout(() => {
        onComplete()
      }, TIMEOUT_AFTER_SUCCESS)
    }
  }, [triggerReturn])

  if (innerLoading) {
    return (
      <LoadingSpinnerV2
        loading={innerLoading}
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Importing Data...'
          }, {
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
            text: 'This process will just take a few seconds.'
          }]
        }}
        containerClassName={styles.loadingSpinner}
        spinnerProps={{ size: 40, thickness: 3 }}
      />
    )
  }

  if (showSuccess) {
    return (
      <SuccessComponent
        title='Data Imported'
        subtitle='You imported the data successfully'
      />
    )
  }

  return (
    <Modal
      key='ModalExport'
      setIsOpen={() => onCanceled()}
      title='Import Data'
      titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
      layout={MODAL_POPUP_V2}
      permanent
    >

      <div className={`${commonStyles.fullWidth} ${typographyStyles.textWhite}  ${styles.content}`}>
        <span className={`${typographyStyles.opacity70}`}>You are about to import your data from: &nbsp;
        </span>
        <span className={`${typographyStyles.opacity100}`}>
          {target}
        </span>
      </div>
      <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <Button
          type='button'
          label='Cancel'
          onClick={() => onCanceled()}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
        />
        <Button
          type='submit'
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
          label='Import now'
          onClick={onExport}
          color={RICH_BLACK}
          backgroundColor={WHITE}
          hoverEffect={DULLS_BACKGROUND_COLOR}
          bordered={false}
        />
      </div>

    </Modal>

  )
}

export default Importing
