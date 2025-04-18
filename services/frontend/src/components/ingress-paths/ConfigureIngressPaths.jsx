import React, { useEffect, useState } from 'react'
import styles from './ConfigureIngressPaths.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import TableConfigureIngressPaths from './TableConfigureIngressPaths'
import {
  getApiEntrypoints,
  callApiApplicationHide,
  callApiApplicationExpose
} from '~/api'
import ErrorComponent from '~/components/errors/ErrorComponent'
import SuccessComponent from '~/components/success/SuccessComponent'
import useICCStore from '~/useICCStore'
import { PAGE_CONFIGURE_INGRESS_PATHS } from '~/ui-constants'
import { WHITE, MODAL_POPUP_V2, MEDIUM, SMALL } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Modal } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import AddPath from './AddPath'
import DeletePath from './DeletePath'
import EditPath from './EditPath'

const ConfigureIngressPaths = React.forwardRef(({ _ }, ref) => {
  const globalState = useICCStore()
  const {
    setNavigation,
    setCurrentPage
  } = globalState
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [ingressPathsLoaded, setIngressPathsLoaded] = useState(false)
  const [ingressPaths, setIngressPaths] = useState([])
  const [filteredIngressPaths, setFilteredIngressPaths] = useState([])
  const [showOnlyApplicationWithPaths, setShowOnlyApplicationWithPaths] = useState(false)
  const [reloadIngressPaths, setReloadIngressPaths] = useState(true)
  const [showModalAddPath, setShowModalAddPath] = useState(false)
  const [showModalEditPath, setShowModalEditPath] = useState(false)
  const [showModalDeletePath, setShowModalDeletePath] = useState(false)
  const [selectedIngressPath, setSelectedIngressPath] = useState(null)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)
  const [showSuccessComponentProps, setShowSuccessComponentProps] = useState({})

  useEffect(() => {
    setNavigation({
      label: 'Configure Ingress paths',
      handleClick: () => {
        setCurrentPage(PAGE_CONFIGURE_INGRESS_PATHS)
      },
      key: PAGE_CONFIGURE_INGRESS_PATHS,
      page: PAGE_CONFIGURE_INGRESS_PATHS
    }, 0)
  }, [])

  useEffect(() => {
    if (reloadIngressPaths) {
      setIngressPathsLoaded(false)
      async function loadIngressPaths () {
        try {
          const ingressPaths = await getApiEntrypoints()
          setIngressPaths([...ingressPaths])
          setFilteredIngressPaths([...ingressPaths])
          setIngressPathsLoaded(true)
          setReloadIngressPaths(false)
        } catch (error) {
          console.error(`Error on getDetailActivities ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadIngressPaths()
    }
  }, [reloadIngressPaths])

  useEffect(() => {
    if (showOnlyApplicationWithPaths) {
      setFilteredIngressPaths([...ingressPaths.filter(ingressPath => (ingressPath?.path ?? '-') !== '-')])
    } else {
      setFilteredIngressPaths([...ingressPaths])
    }
  }, [showOnlyApplicationWithPaths])

  // Add PATH
  function handleOnClickAddPath (ingressPath) {
    setSelectedIngressPath(ingressPath)
    setShowModalAddPath(true)
  }

  function handleCloseModalAddPath () {
    setSelectedIngressPath(null)
    setShowModalAddPath(false)
  }

  async function handleModalConfirmAddPath (path) {
    try {
      await callApiApplicationExpose(selectedIngressPath.applicationId, path)
      setShowSuccessComponentProps({ title: 'Application path added', subtitle: 'Your added a path to your application successfully.' })
      handleCloseModalAddPath()
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setFilteredIngressPaths([])
        setIngressPathsLoaded(false)
        setReloadIngressPaths(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiApplicationExpose ${error}`)
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
    }
  }

  // EDIT
  function handleOnClickEdit (ingressPath) {
    setSelectedIngressPath(ingressPath)
    setShowModalEditPath(true)
  }

  function handleCloseModalEditPath () {
    setSelectedIngressPath(null)
    setShowModalEditPath(false)
  }

  async function handleModalConfirmEditPath (path) {
    try {
      await callApiApplicationExpose(selectedIngressPath.applicationId, path)
      setShowSuccessComponentProps({ title: 'Application path edited', subtitle: 'Your edited the application path successfully.' })
      handleCloseModalEditPath()
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setFilteredIngressPaths([])
        setIngressPathsLoaded(false)
        setReloadIngressPaths(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiApplicationHide ${error}`)
      setError(error)
      setShowErrorComponent(true)
      setShowSuccessComponent(false)
    }
  }

  // DELETE
  function handleOnClickDelete (ingressPath) {
    setSelectedIngressPath(ingressPath)
    setShowModalDeletePath(true)
  }

  function handleCloseModalDeletePath () {
    setSelectedIngressPath(null)
    setShowModalDeletePath(false)
  }

  async function handleModalConfirmDeletePath () {
    try {
      await callApiApplicationHide(selectedIngressPath.applicationId)
      setShowSuccessComponentProps({ title: 'Application path deleted', subtitle: 'Your deleted the application path successfully.' })
      handleCloseModalDeletePath()
      setShowSuccessComponent(true)
      setTimeout(() => {
        setShowSuccessComponent(false)
        setFilteredIngressPaths([])
        setIngressPathsLoaded(false)
        setReloadIngressPaths(true)
      }, 3000)
    } catch (error) {
      console.error(`Error on callApiApplicationHide ${error}`)
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
      <div className={styles.containerActivities} ref={ref}>
        <div className={styles.contentActivities}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
              <Icons.IngressControllIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Configure Ingress Paths</p>
            </div>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyEnd}`}>
              <div>
                <Forms.ToggleSwitch
                  label='Show only Applications with Paths'
                  labelClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
                  name='showOnlyApplicationWithPaths'
                  onChange={() => setShowOnlyApplicationWithPaths(!showOnlyApplicationWithPaths)}
                  checked={showOnlyApplicationWithPaths}
                  size={SMALL}
                />
              </div>
            </div>
          </div>

          <TableConfigureIngressPaths
            ingressPathsLoaded={ingressPathsLoaded}
            ingressPaths={filteredIngressPaths}
            onClickAddPath={handleOnClickAddPath}
            onClickEdit={handleOnClickEdit}
            onClickDelete={handleOnClickDelete}
          />
        </div>
      </div>
      {showSuccessComponent && (
        <SuccessComponent {...showSuccessComponentProps} />
      )}
      {showModalAddPath && (
        <Modal
          key='ModalAddPath'
          setIsOpen={() => handleCloseModalAddPath()}
          title='Add Application path'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <AddPath
            name={selectedIngressPath.applicationName}
            onClickCancel={() => handleCloseModalAddPath()}
            onClickConfirm={(path) => handleModalConfirmAddPath(path)}
          />
        </Modal>
      )}
      {showModalDeletePath && (
        <Modal
          key='ModalDeletePath'
          setIsOpen={() => handleCloseModalDeletePath()}
          title='Delete Application path'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <DeletePath
            name={selectedIngressPath.applicationName}
            onClickCancel={() => handleCloseModalDeletePath()}
            onClickConfirm={() => handleModalConfirmDeletePath()}
          />
        </Modal>
      )}
      {showModalEditPath && (
        <Modal
          key='ModalEditPath'
          setIsOpen={() => handleCloseModalEditPath()}
          title='Edit Application path'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <EditPath
            name={selectedIngressPath.applicationName}
            path={selectedIngressPath.path}
            onClickCancel={() => handleCloseModalEditPath()}
            onClickConfirm={(path) => handleModalConfirmEditPath(path)}
          />
        </Modal>
      )}
    </>
  )
})

export default ConfigureIngressPaths
