import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './DetailPreview.module.css'
import { MARGIN_0, MEDIUM, OPACITY_30, WHITE, TRANSPARENT, SMALL, MODAL_POPUP_V2 } from '@platformatic/ui-components/src/components/constants'
import { PAGE_PREVIEWS } from '~/ui-constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { HorizontalSeparator, TabbedWindow, LoadingSpinnerV2, BorderedBox, VerticalSeparator, PlatformaticIcon, Modal } from '@platformatic/ui-components'
import TaxonomyPreview from '~/components/previews/detail/taxonomy/TaxonomyPreview'
import RiskEnginePreview from '~/components/previews/detail/risk-engine/RiskEnginePreview'
import SettingsPreview from '~/components/previews/detail/settings/SettingsPreview'
import ApplicationLogs from '~/components/application-logs/ApplicationLogs'
import ErrorComponent from '~/components/errors/ErrorComponent'
import Pods from '~/components/pods/Pods'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import {
  getApiTaxonomyGenerations,
  getApiPreviews,
  callApiSynchronizePreviewTaxonomy
} from '~/api'
import { useNavigate, useParams } from 'react-router-dom'
import SynchronizeTaxonomy from '../SynchronizeTaxonomy'
import SuccessComponent from '~/components/success/SuccessComponent'
import useICCStore from '~/useICCStore'

const DetailPreview = React.forwardRef(({ _ }, ref) => {
  const navigate = useNavigate()

  const globalState = useICCStore()
  const { setNavigation, setCurrentPage } = globalState
  const [gravatarUrl] = useState('./assets/githubUser.png')
  const [tabs, setTabs] = useState([])
  const [preview, setPreview] = useState({})
  const [keyTabSelected, setKeyTabSelected] = useState(null)
  const [expandedPullRequestPanel, setExpandedPullRequestPanel] = useState(false)
  const { taxonomyId } = useParams()
  const [mainGeneration, setMainGeneration] = useState(null)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [error, setError] = useState(null)
  const [showModalSynchronizeTaxonomy, setShowModalSynchronizeTaxonomy] = useState(false)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)

  useEffect(() => {
    setNavigation({
      label: 'Previews',
      handleClick: () => {
        setCurrentPage(PAGE_PREVIEWS)
        navigate(PAGE_PREVIEWS)
      },
      key: PAGE_PREVIEWS,
      page: PAGE_PREVIEWS
    }, 0)
  }, [])

  useEffect(() => {
    async function loadTaxonomomyVersions () {
      try {
        const taxonomyGenerations = await getApiTaxonomyGenerations()
        if (taxonomyGenerations.length > 0) {
          setMainGeneration({ ...taxonomyGenerations[0] })
        } else {
          setError({ stack: 'No Main Generation Found!' })
          setShowErrorComponent(true)
        }
      } catch (error) {
        console.error(`Error on getDetailPRS ${error}`)
        setError(error)
        setShowErrorComponent(true)
      }
    }
    loadTaxonomomyVersions()
  }, [])

  useEffect(() => {
    if (mainGeneration && taxonomyId) {
      async function loadPreviews () {
        try {
          const previews = await getApiPreviews(taxonomyId)
          setPreview(previews[0])
        } catch (error) {
          console.error(`Error on getDetailPRS ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadPreviews()
    }
  }, [mainGeneration && taxonomyId])

  useEffect(() => {
    if (tabs.length === 0 && Object.keys(preview).length > 0) {
      const tmpTabs = [{
        label: 'Taxonomy',
        key: 'taxonomy',
        component: () => <TaxonomyPreview taxonomyId={taxonomyId} mainGeneration={mainGeneration} taxonomyGeneration={preview?.taxonomyGeneration} onClickSynchronize={handleOpenModalSynchronizeTaxonomy} />
      }, {
        label: 'Risk Engine',
        key: 'riskengine',
        component: () => <RiskEnginePreview applicationId={preview?.applicationId} taxonomyId={taxonomyId} openapi={preview?.openapi} graphql={preview?.graphql} risk={preview?.risk} db={preview?.db} />
      }]
      if (preview.open) {
        tmpTabs.push({
          label: 'Logs',
          key: 'logs',
          component: () => <ApplicationLogs applicationId={preview?.applicationId} taxonomyId={taxonomyId} enableApplicationFilter={false} borderedBoxContainerClass={styles.logsBorderexBoxContainer} />
        })
        tmpTabs.push({
          label: 'Metrics',
          key: 'pods',
          component: () => <Pods applicationId={preview?.applicationId} taxonomyId={taxonomyId} enableApplicationFilter={false} fromPreview />
        })
      }
      tmpTabs.push({
        label: 'Settings',
        key: 'settings',
        component: () => <SettingsPreview taxonomyId={taxonomyId} taxonomyName={preview?.taxonomyName} open={preview?.open} />
      })
      setTabs(tmpTabs)
      setKeyTabSelected('taxonomy')

      setNavigation({
        label: preview?.taxonomyName || '-',
        handleClick: () => {},
        key: preview?.taxonomyName || '-',
        page: 'Taxonomy-name'
      }, 1)
    }
  }, [tabs.length, Object.keys(preview).length])

  function getMenuItems (pullRequests) {
    return pullRequests.map((pullRequest, index) => (
      <React.Fragment key={`${pullRequest.number}-${index}`}>

        {index !== 0 && <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />}
        <div className={`${commonStyles.flexBlockNogap} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
            <Icons.PullRequestIcon size={SMALL} color={WHITE} />
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>#{pullRequest.number} {pullRequest.title}</span>
          </div>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{pullRequest.repositoryName ?? '-'}</span>
            </div>

            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Commit by:</span>
              <div className={commonStyles.githubUser} style={{ backgroundImage: `url(${gravatarUrl}` }} />
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{pullRequest.commitUserEmail ?? '-'}</span>
            </div>

            <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Last commit:</span>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{pullRequest.commitSha ?? '-'}</span>
            </div>

          </div>
        </div>
      </React.Fragment>
    ))
  }

  function handleCloseModalSynchronizeTaxonomy () {
    setShowModalSynchronizeTaxonomy(false)
  }
  function handleOpenModalSynchronizeTaxonomy () {
    setShowModalSynchronizeTaxonomy(true)
  }

  async function handleConfirmSynchronizeTaxonomy () {
    try {
      const { body } = await callApiSynchronizePreviewTaxonomy(preview.taxonomyId)
      if (!body.error) {
        setShowSuccessComponent(true)
        setTimeout(() => setShowSuccessComponent(false), 3000)
      } else {
        throw Error(body.error)
      }
    } catch (error) {
      setError(error)
      setShowErrorComponent(true)
    } finally {
      setShowModalSynchronizeTaxonomy(false)
    }
  }

  if (showErrorComponent) {
    return <ErrorComponent error={error} message={error.message} onClickDismiss={() => setShowErrorComponent(false)} />
  }

  if (tabs.length === 0 || keyTabSelected === null) {
    return (
      <LoadingSpinnerV2
        loading
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Loading ...'
          }]
        }}
        containerClassName={loadingSpinnerStyles.loadingSpinner}
        spinnerProps={{ size: 40, thickness: 3 }}

      />
    )
  }

  return (
    <>
      <div className={styles.previewContainer} ref={ref}>
        <div className={styles.previewContent}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.CodeTestingIcon
              color={WHITE}
              size={MEDIUM}
            />
            <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{preview?.taxonomyName ?? '-'}</p>
            {(preview?.pullRequests ?? []).length >= 1 && (
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{(preview?.pullRequests ?? []).length > 1 ? `View PRs (${preview.pullRequests.length})` : 'View PR'}</span>
                <PlatformaticIcon internalOverHandling iconName={!expandedPullRequestPanel ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpandedPullRequestPanel(!expandedPullRequestPanel)} disabled={(preview?.pullRequests ?? []).length === 0} />
              </div>
            )}
          </div>

          {expandedPullRequestPanel && (
            <BorderedBox color={WHITE} borderColorOpacity={OPACITY_30} backgroundColor={TRANSPARENT} classes={styles.boxPreviewPullRequests}>
              <div className={`${commonStyles.fullWidth} ${commonStyles.miniFlexBlock}`}>
                {getMenuItems(preview?.pullRequests ?? [])}
              </div>
            </BorderedBox>
          )}

          <div className={commonStyles.fullWidth}>
            <TabbedWindow
              tabs={tabs}
              keySelected={keyTabSelected}
              callbackSelected={setKeyTabSelected}
              tabContainerClassName={styles.previewTabContainer}
              tabContentClassName={styles.previewTabContent}
              textClassName={`${typographyStyles.desktopOtherOverlineSmall} ${typographyStyles.textWhite} ${styles.customTab}`}
            />
          </div>
        </div>
      </div>
      {showModalSynchronizeTaxonomy && (
        <Modal
          key='modalSynchronizeTaxonomy'
          setIsOpen={() => handleCloseModalSynchronizeTaxonomy()}
          title='Synchronize Taxonomy'
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
          layout={MODAL_POPUP_V2}
          permanent
        >
          <SynchronizeTaxonomy
            generationCurrent={(preview?.taxonomyGeneration ?? '-')}
            generationNext={mainGeneration?.mainIteration}
            onClickCancel={() => handleCloseModalSynchronizeTaxonomy()}
            onClickConfirm={() => handleConfirmSynchronizeTaxonomy()}
          />
        </Modal>
      )}
      {showSuccessComponent && (
        <SuccessComponent
          title='Taxonomy Synchronized'
          subtitle='You successfully synchronized the Taxonomy'
        />
      )}
    </>
  )
})

export default DetailPreview
