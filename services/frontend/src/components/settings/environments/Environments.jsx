import React, { useEffect, useState } from 'react'
import { WHITE, RICH_BLACK, DULLS_BACKGROUND_COLOR, TRANSPARENT, MODAL_POPUP_V2, SMALL, MEDIUM, BLACK_RUSSIAN } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Environments.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { BorderedBox, Button, Modal } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'
import SuccessComponent from '~/components/success/SuccessComponent'
import InProgressComponent from '~/components/in-progress/InProgressComponent'
import TableEnvironments from './TableEnvironments'
import {
  getApiEnvironments,
  callApiImportEnvironment,
  callApiExportEnvironment
} from '~/api'
import ExportEnvironment from './ExportEnvironment'
import ImportEnvironment from './ImportEnvironment'

function Environments () {
  const [error, setError] = useState(null)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [environmentsLoaded, setEnvironmentsLoaded] = useState(false)
  const [reloadEnvironments, setReloadEnvironments] = useState(true)
  const [environments, setEnvironments] = useState([])
  const [showModalExportEnvironment, setShowModalExportEnvironment] = useState(false)
  const [showModalImportEnvironment, setShowModalImportEnvironment] = useState(false)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)
  const [showSuccessComponentProps, setShowSuccessComponentProps] = useState({})
  const [showInProgressComponent, setShowInProgressComponent] = useState(false)
  const [showInProgressComponentProps, setShowInProgressComponentProps] = useState({})

  useEffect(() => {
    if (!environmentsLoaded && reloadEnvironments) {
      setEnvironmentsLoaded(false)
      async function loadEnvironments () {
        try {
          const { activities } = await getApiEnvironments()
          setEnvironmentsLoaded(true)
          setReloadEnvironments(false)
          setEnvironments([...activities])
        } catch (error) {
          console.error(`Error on loadEnvironments ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadEnvironments()
    }
  }, [environmentsLoaded, reloadEnvironments])

  function renderContent (imported = true) {
    return (
      <TableEnvironments
        key={imported ? 'imported' : 'exported'}
        environmentsLoaded={environmentsLoaded}
        environments={environments.filter(env => imported ? env.imported : !env.imported)}
        imported={imported}
      />
    )
  }

  // IMPORT ENVIRONMENT
  function handleOnClickImportEnvironment () {
    setShowModalImportEnvironment(true)
  }

  function handleCloseModalImportEnvironment () {
    setShowModalImportEnvironment(false)
  }

  async function handleModalConfirmImportEnvironment (file) {
    try {
      setShowInProgressComponentProps({
        title: 'Importing environment...',
        subtitle: 'This process will take a few minutes.',
        icon: <Icons.ComputerInIcon color={WHITE} size={SMALL} />
      })
      setShowInProgressComponent(true)
      handleCloseModalImportEnvironment()
      const blob = new Blob([file], { type: 'application/x-tar' })
      const formData = new FormData()
      formData.append('file', blob, { filename: file.filename })

      await callApiImportEnvironment(formData)
      setShowSuccessComponentProps({ title: 'Environment imported', subtitle: 'You imported a new environment successfully.' })
      setShowInProgressComponent(false)
      setShowInProgressComponentProps({})
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setEnvironments([])
        setEnvironmentsLoaded(false)
        setReloadEnvironments(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiImportEnvironment ${error}`)
      handleCloseModalImportEnvironment()
      setShowInProgressComponent(false)
      setShowInProgressComponentProps({})
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
    }
  }

  // EXPORT ENVIRONMENT
  function handleOnClickExportEnvironment () {
    setShowModalExportEnvironment(true)
  }

  function handleCloseModalExportEnvironment () {
    setShowModalExportEnvironment(false)
  }

  async function handleModalConfirmExportEnvironment () {
    try {
      setShowInProgressComponentProps({
        title: 'Exporting environment...',
        subtitle: 'This process will take a few minutes.',
        icon: <Icons.ComputerOutIcon color={WHITE} size={SMALL} />
      })
      setShowInProgressComponent(true)
      handleCloseModalExportEnvironment()
      const response = await callApiExportEnvironment()
      const a = document.createElement('a')
      const file = await response.blob()
      a.href = window.URL.createObjectURL(file)
      a.download = 'main.bundle.tar'
      a.click()
      a.remove()
      setShowSuccessComponentProps({ title: 'Environment exported', subtitle: 'You exported the application environment successfully.' })
      setShowInProgressComponent(false)
      setShowInProgressComponentProps({})
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setEnvironments([])
        setEnvironmentsLoaded(false)
        setReloadEnvironments(true)
      }, 3000)
    } catch (error) {
      setShowInProgressComponent(false)
      setShowInProgressComponentProps({})
      console.error(`Error on callApiExportEnvironment ${error}`)
      handleCloseModalExportEnvironment()
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
    }
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  return (
    <>
      <div className={`${commonStyles.largeFlexBlock} ${commonStyles.fullWidth}`}>
        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxEnvironment}>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
                <Icons.ComputerOutIcon color={WHITE} size={MEDIUM} />
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Environment Exported</p>
              </div>

              <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyEnd}`}>
                <Button
                  label='Export Environment'
                  onClick={() => handleOnClickExportEnvironment()}
                  color={RICH_BLACK}
                  backgroundColor={WHITE}
                  hoverEffect={DULLS_BACKGROUND_COLOR}
                  paddingClass={commonStyles.smallButtonPadding}
                  textClass={typographyStyles.desktopButtonSmall}
                  platformaticIcon={{ iconName: 'ComputerOutIcon', color: RICH_BLACK }}
                  bordered={false}
                />
              </div>
            </div>

            {renderContent(false)}
          </div>
        </BorderedBox>

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxEnvironment}>
          <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
                <Icons.ComputerInIcon color={WHITE} size={MEDIUM} />
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Environment Imported</p>
              </div>

              <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyEnd}`}>
                <Button
                  label='Import Environment'
                  onClick={() => handleOnClickImportEnvironment()}
                  color={RICH_BLACK}
                  backgroundColor={WHITE}
                  hoverEffect={DULLS_BACKGROUND_COLOR}
                  paddingClass={commonStyles.smallButtonPadding}
                  textClass={typographyStyles.desktopButtonSmall}
                  platformaticIcon={{ iconName: 'ComputerInIcon', color: RICH_BLACK }}
                  bordered={false}
                />
              </div>
            </div>

            {renderContent(true)}
          </div>
        </BorderedBox>
      </div>
      {showSuccessComponent && (
        <SuccessComponent {...showSuccessComponentProps} />
      )}
      {showInProgressComponent && (
        <InProgressComponent {...showInProgressComponentProps} />
      )}
      {showModalExportEnvironment && (
        <Modal
          key='ModalExportEnvironment'
          setIsOpen={() => handleCloseModalExportEnvironment()}
          title='Export Environment'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ExportEnvironment
            onClickCancel={() => handleCloseModalExportEnvironment()}
            onClickConfirm={(path) => handleModalConfirmExportEnvironment(path)}
          />
        </Modal>
      )}
      {showModalImportEnvironment && (
        <Modal
          key='ModalImportEnvironment'
          setIsOpen={() => handleCloseModalImportEnvironment()}
          title='Import Environment'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ImportEnvironment
            onClickCancel={() => handleCloseModalImportEnvironment()}
            onClickConfirm={(file) => handleModalConfirmImportEnvironment(file)}
          />
        </Modal>
      )}
    </>
  )
}

export default Environments
