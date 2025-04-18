import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Settings.module.css'
import { PAGE_APPLICATION_DETAIL_SETTINGS, HOME_PATH, PAGE_APPS } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import Icons from '@platformatic/ui-components/src/components/icons'
import {
  BLACK_RUSSIAN,
  DULLS_BACKGROUND_COLOR,
  ERROR_RED,
  MEDIUM,
  MODAL_FULL_RICH_BLACK_V2,
  MODAL_POPUP_V2,
  OPACITY_10,
  RICH_BLACK,
  SMALL,
  TRANSPARENT,
  WHITE
} from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button, Modal, Report } from '@platformatic/ui-components'
import TableEnvironmentVariables from './TableEnvironmentVariables'
import {
  getApiEnvironmentVariables,
  saveApiEnvironmentVariables,
  callApiRevokeKey,
  callApiDeleteApplication,
  getApiAPIKeys
} from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import SuccessComponent from '~/components/success/SuccessComponent'
import UnsavedChanges from './UnsavedChanges'
import TableAPIKeys from './TableAPIKeys'
import Forms from '@platformatic/ui-components/src/components/forms'
import AddApiKey from '~/components/apikey/AddApiKey'
import RegenerateApiKey from '~/components/apikey/RegenerateApiKey'
import RevokeApiKey from '~/components/apikey/RevokeApiKey'
import DeleteApplication from '../DeleteApplication'
import ModalAddEnvironmentVariableFromFile from './ModalAddEnvironmentVariableFromFile'
import ModalReplaceEnvironmentVariables from './ModalReplaceEnvironmentVariables'
import ModalReplaceEnvironmentVariable from './ModalReplaceEnvironmentVariable'
import BoxEnvironmentVariableFromFile from './BoxEnvironmentVariableFromFile'
import { useNavigate } from 'react-router-dom'
import Resources from './Resources'

const Settings = React.forwardRef(({ _ }, ref) => {
  const navigate = useNavigate()
  const globalState = useICCStore()
  const { applicationSelected, setCurrentPage, showSplashScreen } = globalState
  const [readOnlyVariables, setReadOnlyVariables] = useState(true)
  const [environmentVariablesLoaded, setEnvironmentVariablesLoaded] = useState(false)
  const [environmentVariablesLoadedFromApi, setEnvironmentVariablesLoadedFromApi] = useState(false)
  const [environmentVariables, setEnvironmentVariables] = useState({})
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)
  const [showSuccessComponentProps, setShowSuccessComponentProps] = useState({})
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false)
  const [showRevokedKeys, setShowRevokedKeys] = useState(true)
  const [filteredApiKeys, setFilteredApiKeys] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false)
  const [showModalAddApiKey, setShowModalAddApiKey] = useState(false)
  const [showModalRevokeApiKey, setShowModalRevokeApiKey] = useState(false)
  const [showModalRegenerateApiKey, setShowModalRegenerateApiKey] = useState(false)
  const [showModalDeleteApplication, setShowModalDeleteApplication] = useState(false)
  const [showModalAddVariablesFromFile, setShowModalAddVariablesFromFile] = useState(false)
  const [showModalReplaceEnvironmentVariables, setShowModalReplaceEnvironmentVariables] = useState(false)
  const [showModalReplaceEnvironmentVariable, setShowModalReplaceEnvironmentVariable] = useState(false)
  const [showPanelAddVariablesFromFile, setShowPanelAddVariablesFromFile] = useState(false)
  const [environmentVariablesAddedFromFile, setEnvironmentVariablesAddedFromFile] = useState([false])
  const [environmentVariableToReplace, setEnvironmentVariableToReplace] = useState({})
  const [apiKeySelected, setApiKeySelected] = useState(null)
  const [addedKey, setAddedKey] = useState(false)
  const [regeneratedKey, setRegeneratedKey] = useState(false)

  useEffect(() => {
    setCurrentPage(PAGE_APPLICATION_DETAIL_SETTINGS)
  }, [])

  useEffect(() => {
    if (Object.keys(environmentVariableToReplace).length > 0) {
      setShowModalReplaceEnvironmentVariable(true)
    } else {
      setShowModalReplaceEnvironmentVariable(false)
    }
  }, [Object.keys(environmentVariableToReplace)])

  useEffect(() => {
    if (applicationSelected && !environmentVariablesLoadedFromApi) {
      async function loadEnvironmentVariables () {
        try {
          const environmentVariables = await getApiEnvironmentVariables(applicationSelected.id)
          setEnvironmentVariables(environmentVariables)
          setEnvironmentVariablesLoadedFromApi(true)
        } catch (error) {
          console.error(`Error on getApiEnvironmentVariables ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadEnvironmentVariables()
    }
  }, [applicationSelected, environmentVariablesLoadedFromApi])

  useEffect(() => {
    if (applicationSelected && !apiKeysLoaded) {
      async function loadApiKeys () {
        try {
          const apiKeys = await getApiAPIKeys(applicationSelected.id)
          setApiKeys(apiKeys)
          setFilteredApiKeys(apiKeys)
          setApiKeysLoaded(true)
        } catch (error) {
          console.error(`Error on getApiAPIKeys ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadApiKeys()
    }
  }, [applicationSelected, apiKeysLoaded])

  useEffect(() => {
    if (showRevokedKeys) {
      setFilteredApiKeys([...apiKeys])
    } else {
      setFilteredApiKeys([...apiKeys.filter(key => key.revoked === false)])
    }
  }, [showRevokedKeys])

  async function handleSave (payload) {
    try {
      await saveApiEnvironmentVariables(applicationSelected.id, payload)
      setShowSuccessComponentProps({ title: 'New version created', subtitle: 'Your changes have been applied successfully.' })
      setShowSuccessComponent(true)
      setEnvironmentVariables({})
      setEnvironmentVariablesLoadedFromApi(false)
      setShowPanelAddVariablesFromFile(false)
      setEnvironmentVariablesAddedFromFile([])
      setReadOnlyVariables(true)
      setTimeout(() => setShowSuccessComponent(false), 3000)
    } catch (error) {
      console.error(`Error on saveApiEnvironmentVariables ${error}`)
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
    }
  }

  function handleCancel (formDirty) {
    if (formDirty) {
      setShowUnsavedChanges(true)
    } else {
      setEnvironmentVariablesLoadedFromApi(false)
      setEnvironmentVariables({})
      setReadOnlyVariables(true)
    }
  }

  function handleCloseModalUnsaved () {
    setShowUnsavedChanges(false)
  }

  function handleConfirmDeleteChanges () {
    setShowUnsavedChanges(false)
    setReadOnlyVariables(true)
  }

  // Add KEY
  function handleClickAdd () {
    setShowModalAddApiKey(true)
  }
  function handleCloseModalAddApiKey () {
    setShowModalAddApiKey(false)
  }

  function handleModalAddApiKeyError (error) {
    handleCloseModalAddApiKey()
    setError(error)
    setShowErrorComponent(true)
  }

  function handleModalAddApiKeySuccess () {
    handleCloseModalAddApiKey()
    setFilteredApiKeys([])
    setApiKeysLoaded(false)
    setAddedKey(false)
  }

  // REGENERATE KEY
  function handleClickRegenerate (apikey) {
    setApiKeySelected(apikey)
    setShowModalRegenerateApiKey(true)
  }
  function handleCloseModalRegenerateApiKey () {
    setApiKeySelected(null)
    setShowModalRegenerateApiKey(false)
  }

  function handleModalRegenerateApiKeyError (error) {
    handleCloseModalRegenerateApiKey()
    setError(error)
    setShowErrorComponent(true)
  }

  function handleModalRegenerateApiKeySuccess () {
    handleCloseModalRegenerateApiKey()
    setFilteredApiKeys([])
    setApiKeysLoaded(false)
    setRegeneratedKey(false)
  }

  // REVOKE KEY
  function handleClickRevoke (apikey) {
    setApiKeySelected(apikey)
    setShowModalRevokeApiKey(true)
  }
  function handleCloseModalRevokeApiKey () {
    setApiKeySelected(null)
    setShowModalRevokeApiKey(false)
  }
  async function handleConfirmModalRevokeApiKey () {
    try {
      const { revoked } = await callApiRevokeKey(applicationSelected?.id, apiKeySelected.id)
      if (revoked) {
        setShowSuccessComponent(true)
        setShowSuccessComponentProps({ title: 'API Key revoked', subtitle: 'You successfully revoked the API key of your application.' })
        setTimeout(() => {
          setShowSuccessComponent(false)
          setFilteredApiKeys([])
          setApiKeysLoaded(false)
        }, 3000)
      } else {
        setError('API KEY Not revoked')
        setShowErrorComponent(true)
      }
    } catch (error) {
      setError(error)
      setShowErrorComponent(true)
    } finally {
      setShowModalRevokeApiKey(false)
      setApiKeySelected(null)
    }
  }

  // DELETE APPLICATION
  function handleCloseModalDeleteApplication () {
    setShowModalDeleteApplication(false)
  }

  async function handleConfirmDeleteApplication () {
    try {
      setShowModalDeleteApplication(false)
      const { body } = await callApiDeleteApplication(applicationSelected.id)
      if (body.steps) {
        const steps = body.steps.map(step => {
          return {
            type: step.errors.length > 0 ? 'error' : 'success',
            label: step.description
          }
        })
        showSplashScreen({
          title: 'Operation Successful',
          content: <Report steps={steps} />,
          type: 'success',
          onDismiss: () => {
            setCurrentPage(PAGE_APPS)
            navigate(HOME_PATH)
            setShowSuccessComponent(false)
          }
        })
      }
    } catch (error) {
      setError(error)
      setShowErrorComponent(true)
    } finally {
      setShowModalDeleteApplication(false)
    }
  }

  // MODAL ADD ENV VARIABLES FROM FILE
  function handleCloseModaAddVariablesFromFile () {
    setShowModalAddVariablesFromFile(false)
  }

  function handleConfirmAddVariablesFromFile (environmentVariables) {
    setShowPanelAddVariablesFromFile(true)
    setEnvironmentVariablesAddedFromFile(environmentVariables)
    setShowModalAddVariablesFromFile(false)
  }

  function handleRemoveFile () {
    setShowPanelAddVariablesFromFile(false)
    setEnvironmentVariablesAddedFromFile([])
  }

  function handleOnClickAddAllVariable (vars) {
    setEnvironmentVariablesLoaded(false)
    const envTmp = { ...environmentVariables }
    setEnvironmentVariables({})
    setShowPanelAddVariablesFromFile(false)

    setTimeout(() => {
      setEnvironmentVariables({ ...envTmp, ...vars })
      setEnvironmentVariablesAddedFromFile([])
      setEnvironmentVariablesLoaded(true)
    }, 500)
  }

  function handleOnClickReplaceCurrentVariable () {
    setShowModalReplaceEnvironmentVariables(true)
  }

  function handleCloseModaAReplaceEnvironmentVariables () {
    setShowModalReplaceEnvironmentVariables(false)
  }

  function handleConfirmReplaceEnvironmentVariables () {
    const newEnvVars = environmentVariablesAddedFromFile.reduce((acc, current) => {
      acc[current.label] = current.value
      return acc
    }, {})

    setEnvironmentVariables({})
    setShowPanelAddVariablesFromFile(false)

    setTimeout(() => {
      setShowPanelAddVariablesFromFile(false)
      setEnvironmentVariables(newEnvVars)
      setEnvironmentVariablesAddedFromFile([])
      setEnvironmentVariablesLoaded(true)
      setShowModalReplaceEnvironmentVariables(false)
    }, 500)
  }

  function handleOnClickAddVariable (variable) {
    const envTmp = { ...environmentVariables }

    if (environmentVariables[variable.label]) {
      setEnvironmentVariableToReplace(variable)
    } else {
      setEnvironmentVariablesLoaded(false)
      setEnvironmentVariables({})
      setTimeout(() => {
        setEnvironmentVariablesLoaded(true)
        // update variable value
        setEnvironmentVariables({ ...envTmp, [variable.label]: variable.value })
        // remove variable from the list
        setEnvironmentVariablesAddedFromFile(environmentVariablesAddedFromFile => environmentVariablesAddedFromFile.filter(environmentVariable => variable.label !== environmentVariable.label))
      }, 500)
    }
  }

  function handleCloseModaAReplaceEnvironmentVariable () {
    setShowModalReplaceEnvironmentVariable(false)
  }

  function handleConfirmReplaceEnvironmentVariable () {
    const envTmp = { ...environmentVariables }
    setEnvironmentVariablesLoaded(false)
    setEnvironmentVariables({})
    setTimeout(() => {
      // update variable value
      setEnvironmentVariables({ ...envTmp, [environmentVariableToReplace.label]: environmentVariableToReplace.value })
      // remove variable from the list
      setEnvironmentVariablesAddedFromFile(environmentVariablesAddedFromFile => environmentVariablesAddedFromFile.filter(environmentVariable => environmentVariableToReplace.label !== environmentVariable.label))
      setEnvironmentVariableToReplace({})
      setEnvironmentVariablesLoaded(true)
    }, 500)
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }
  if (applicationSelected === null) {
    return <div>Loading...</div>
  }
  return (
    <>

      <div className={styles.applicationSettingsContainer} ref={ref}>
        <div className={styles.applicationSettingsContent}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.AppSettingsIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Settings</p>
          </div>
          <Resources
            applicationId={applicationSelected.id}
          />
          <div className={styles.applicationSettingsBoxesContainer}>
            <BorderedBox
              color={TRANSPARENT}
              backgroundColor={BLACK_RUSSIAN}
              classes={styles.borderexBoxContainerEnvironmentVariables}
            >
              <div className={`${commonStyles.smallFlexBlock} ${commonStyles.itemsCenter}`}>
                <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${styles.header}`}>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
                    <Icons.EnvVariableszIcon
                      color={WHITE}
                      size={MEDIUM}
                    />
                    <div>
                      <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Environment Variables</p>
                    </div>
                  </div>
                  {readOnlyVariables
                    ? (
                      <div>
                        <Button
                          textClass={typographyStyles.desktopButtonSmall}
                          paddingClass={commonStyles.smallButtonPadding}
                          onClick={() => setReadOnlyVariables(false)}
                          label={(environmentVariablesLoadedFromApi || environmentVariablesLoaded) ? (Object.keys(environmentVariables).length > 0 ? 'Edit Variables' : 'Add Variables') : 'Loading Variables...'}
                          bordered={false}
                          color={RICH_BLACK}
                          backgroundColor={WHITE}
                          hoverEffect={DULLS_BACKGROUND_COLOR}
                          platformaticIcon={{ iconName: 'AddEnvVariableIcon', color: RICH_BLACK }}
                          disabled={!(environmentVariablesLoadedFromApi || environmentVariablesLoaded)}
                        />
                      </div>
                      )
                    : (
                      <div>
                        <Button
                          textClass={typographyStyles.desktopButtonSmall}
                          paddingClass={commonStyles.smallButtonPadding}
                          onClick={() => setShowModalAddVariablesFromFile(true)}
                          label='Add variables from .env file'
                          color={WHITE}
                          backgroundColor={RICH_BLACK}
                        />
                      </div>
                      )}
                </div>

                {showPanelAddVariablesFromFile && (
                  <BoxEnvironmentVariableFromFile
                    environmentVariables={environmentVariablesAddedFromFile}
                    onClickRemoveFile={handleRemoveFile}
                    onClickAdd={(envVariable) => handleOnClickAddVariable(envVariable)}
                    onClickAddAllVariables={vars => handleOnClickAddAllVariable(vars)}
                    onClickReplaceCurrentVariable={handleOnClickReplaceCurrentVariable}
                  />
                )}

                <TableEnvironmentVariables
                  key={Object.keys(environmentVariables)}
                  environmentVariablesLoaded={environmentVariablesLoadedFromApi || environmentVariablesLoaded}
                  environmentVariables={environmentVariables}
                  readOnlyVariables={readOnlyVariables}
                  onClickCancel={handleCancel}
                  onClickSave={(payload) => handleSave(payload)}
                />
              </div>
            </BorderedBox>

            {readOnlyVariables && (
              <BorderedBox
                color={TRANSPARENT}
                backgroundColor={BLACK_RUSSIAN}
                classes={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} ${styles.borderexBoxContainerApiKeys}`}
              >
                <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
                    <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
                      <Icons.APIKeyIcon
                        color={WHITE}
                        size={MEDIUM}
                      />
                      <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>API Keys</p>
                    </div>
                    <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyEnd}`}>
                      {apiKeys.find(k => k.revoked) !== undefined && (
                        <div>
                          <Forms.ToggleSwitch
                            label='Show revoked Keys'
                            labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                            name='showRevokedKeys'
                            onChange={() => setShowRevokedKeys(!showRevokedKeys)}
                            checked={showRevokedKeys}
                            size={SMALL}
                          />
                        </div>)}
                      <Button
                        textClass={typographyStyles.desktopButtonSmall}
                        paddingClass={commonStyles.smallButtonPadding}
                        onClick={() => handleClickAdd()}
                        label='Add Key'
                        bordered={false}
                        color={RICH_BLACK}
                        backgroundColor={WHITE}
                        platformaticIcon={{ iconName: 'AddEnvVariableIcon', color: RICH_BLACK }}
                      />
                    </div>
                  </div>

                  <TableAPIKeys
                    apiKeysLoaded={apiKeysLoaded}
                    apiKeys={filteredApiKeys}
                    onClickRegenerate={(apikey) => handleClickRegenerate(apikey)}
                    onClickRevoke={(apikey) => handleClickRevoke(apikey)}
                  />
                </div>
              </BorderedBox>
            )}

            {readOnlyVariables && (
              <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
                <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textErrorRed}`} title='Danger Zone'>
                  Danger Zone
                </p>
                <BorderedBox backgroundColor={ERROR_RED} backgroundColorOpacity={OPACITY_10} color={TRANSPARENT} classes={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} `}>
                  <div className={`${commonStyles.flexBlockNoGap}`}>
                    <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textErrorRed}`}>Delete Application</span>
                    <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} `}>You are about to delete permanently your application. This action is irreversible</span>
                  </div>
                  <Button
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    label='Delete Application'
                    color={ERROR_RED}
                    type='button'
                    onClick={() => {
                      setShowModalDeleteApplication(true)
                    }}
                  />
                </BorderedBox>
              </div>
            )}
          </div>
        </div>
      </div>
      {showSuccessComponent && (
        <SuccessComponent {...showSuccessComponentProps} />
      )}
      {showUnsavedChanges && (
        <Modal
          key='modalUnsavedChanges'
          setIsOpen={() => handleCloseModalUnsaved()}
          title='Unsaved changes'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <UnsavedChanges
            onClickCancel={() => handleCloseModalUnsaved()}
            onClickConfirm={() => handleConfirmDeleteChanges()}
          />
        </Modal>
      )}
      {showModalAddApiKey && (
        <Modal
          key='ModalAddApiKey'
          layout={MODAL_FULL_RICH_BLACK_V2}
          setIsOpen={() => addedKey ? handleModalAddApiKeySuccess() : handleCloseModalAddApiKey()}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
          showCloseButtonOnTop={addedKey}
          permanent
        >
          <AddApiKey
            id={applicationSelected.id}
            onClickCancel={() => handleCloseModalAddApiKey()}
            onError={(errorReturned) => handleModalAddApiKeyError(errorReturned)}
            onClickClose={() => handleModalAddApiKeySuccess()}
            onAddedKey={() => setAddedKey(true)}
          />
        </Modal>
      )}
      {showModalRegenerateApiKey && (
        <Modal
          key='ModalRegenerateApiKey'
          layout={MODAL_FULL_RICH_BLACK_V2}
          setIsOpen={() => regeneratedKey ? handleModalRegenerateApiKeySuccess() : handleCloseModalRegenerateApiKey()}
          childrenClassContainer={`${styles.modalClassName} ${styles.rootV1}`}
          modalCloseClassName={styles.modalCloseClassName}
          showCloseButtonOnTop={regeneratedKey}
          permanent
        >
          <RegenerateApiKey
            id={apiKeySelected.id}
            applicationId={applicationSelected.id}
            name={applicationSelected.name}
            onClickCancel={() => handleCloseModalRegenerateApiKey()}
            onError={(errorReturned) => handleModalRegenerateApiKeyError(errorReturned)}
            onClickClose={() => handleModalRegenerateApiKeySuccess()}
            onRegeneratedKey={() => setRegeneratedKey(true)}
          />
        </Modal>
      )}
      {showModalRevokeApiKey && (
        <Modal
          key='modalCloseEnvironment'
          setIsOpen={() => handleCloseModalRevokeApiKey()}
          title='Revoke API Key'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <RevokeApiKey
            name={applicationSelected.name}
            onClickCancel={() => handleCloseModalRevokeApiKey()}
            onClickConfirm={() => handleConfirmModalRevokeApiKey()}
          />
        </Modal>
      )}
      {showModalDeleteApplication && (
        <Modal
          key='modalDeleteApplication'
          setIsOpen={() => handleCloseModalDeleteApplication()}
          title='Delete Application'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <DeleteApplication
            name={applicationSelected.name}
            onClickCancel={() => handleCloseModalDeleteApplication()}
            onClickConfirm={() => handleConfirmDeleteApplication()}
          />
        </Modal>
      )}
      {showModalAddVariablesFromFile && (
        <Modal
          key='modalAddVariablesFromFile'
          setIsOpen={() => handleCloseModaAddVariablesFromFile()}
          title='Add variables from .env file'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ModalAddEnvironmentVariableFromFile
            onClickCancel={() => handleCloseModaAddVariablesFromFile()}
            onClickConfirm={(environmentVariables) => handleConfirmAddVariablesFromFile(environmentVariables)}
          />
        </Modal>
      )}
      {showModalReplaceEnvironmentVariables && (
        <Modal
          key='modalReplaceEnvironmentVariables'
          setIsOpen={() => handleCloseModaAReplaceEnvironmentVariables()}
          title='Replace Variables'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ModalReplaceEnvironmentVariables
            onClickCancel={() => handleCloseModaAReplaceEnvironmentVariables()}
            onClickConfirm={() => handleConfirmReplaceEnvironmentVariables()}
          />
        </Modal>
      )}
      {showModalReplaceEnvironmentVariable && (
        <Modal
          key='modalReplaceEnvironmentVariable'
          setIsOpen={() => handleCloseModaAReplaceEnvironmentVariable()}
          title='Replace Variables'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <ModalReplaceEnvironmentVariable
            name={environmentVariableToReplace.label}
            onClickCancel={() => handleCloseModaAReplaceEnvironmentVariable()}
            onClickConfirm={() => handleConfirmReplaceEnvironmentVariable()}
          />
        </Modal>
      )}
    </>
  )
})

export default Settings
