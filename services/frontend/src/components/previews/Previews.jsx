import React, { useState, useEffect } from 'react'
import styles from './Previews.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { PAGE_PREVIEWS, UP, DOWN, STALE, PREVIEWS_DETAIL_PATH, REFRESH_INTERVAL_APPLICATIONS } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import PreviewsMetric from './PreviewsMetric'
import RiskOpenPrs from './RiskOpenPrs'
import Icons from '@platformatic/ui-components/src/components/icons'
import { MODAL_POPUP_V2, MEDIUM, WHITE } from '@platformatic/ui-components/src/components/constants'
import TablePreviews from './TablePreviews'
import ErrorComponent from '~/components/errors/ErrorComponent'
import {
  getApiTaxonomyGenerations,
  getApiPreviews,
  callApiSynchronizePreviewTaxonomy
} from '~/api'
import ClosedRiskChart from './ClosedRiskChart'
import { Modal } from '@platformatic/ui-components'
import SynchronizeTaxonomy from './SynchronizeTaxonomy'
import SuccessComponent from '~/components/success/SuccessComponent'
import { useNavigate } from 'react-router-dom'

const Previews = React.forwardRef(({ _ }, ref) => {
  const navigate = useNavigate()
  const globalState = useICCStore()
  const { setNavigation, setCurrentPage } = globalState
  const [previews, setPreviews] = useState([])
  const [previewsLoaded, setPreviewsLoaded] = useState(false)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [showModalSynchronizeTaxonomy, setShowModalSynchronizeTaxonomy] = useState(false)
  const [taxonomyToSynchronizeSelected, setTaxonomyToSynchronizeSelected] = useState(null)
  const [statusOpen, setStatusOpen] = useState(true)
  const [error, setError] = useState(null)
  const [mainGeneration, setMainGeneration] = useState(null)
  const [riskImpactLatestMergedPr, setRiskImpactLatestMergedPr] = useState(null)
  const [overallRiskMerkedPrToDate, setOverallRiskMerkedPrToDate] = useState(null)
  const [showSuccessComponent, setShowSuccessComponent] = useState(false)
  const [timer, setTimer] = useState(REFRESH_INTERVAL_APPLICATIONS / 1000)
  const [timerInterval, setTimerInterval] = useState(null)
  const [latestRefreshDate, setLatestRefresDate] = useState(new Date())

  useEffect(() => {
    setNavigation({
      label: 'Previews',
      handleClick: () => {
        setCurrentPage(PAGE_PREVIEWS)
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
    if (mainGeneration && !previewsLoaded) {
      async function loadPreviews () {
        try {
          const previews = await getApiPreviews()
          setPreviews(previews)
          setPreviewsLoaded(true)
          startTimer()
          setLatestRefresDate(new Date())
        } catch (error) {
          console.error(`Error on getDetailPRS ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadPreviews()
    }
  }, [mainGeneration, previewsLoaded])

  useEffect(() => {
    if (previewsLoaded) {
      let averageRiskMergedPr = '-'
      let averageRisk = '-'
      let difference = '-'
      let direction = STALE
      let titleDifferenceLatestMergedPr = ''
      if (previews.length > 0) {
        let notUndefinedElementsLength = 0
        averageRisk = previews.reduce((accumulator, currentValue) => {
          if ((currentValue?.risk ?? 0) > 0) {
            notUndefinedElementsLength++
          }
          accumulator += currentValue?.risk ?? 0
          return accumulator
        }, 0)
        averageRisk = Number.parseFloat(averageRisk / notUndefinedElementsLength).toFixed(2)

        notUndefinedElementsLength = 0
        averageRiskMergedPr = previews.filter(preview => preview.merged).reduce((accumulator, currentValue) => {
          if ((currentValue?.risk ?? 0) > 0) {
            notUndefinedElementsLength++
          }
          accumulator += currentValue?.risk ?? 0
          return accumulator
        }, 0)
        averageRiskMergedPr = Number.parseFloat(averageRiskMergedPr / notUndefinedElementsLength).toFixed(2)

        if (previews.length > 1) {
          previews.sort((a, b) => {
            if (a.closedAt < b.closedAt) {
              return 1
            } else if (a.closedAt > b.closedAt) {
              return 0
            }
            // a must be equal to b
            return 0
          })
          const lastPr = previews[0]
          difference = Number.parseFloat(averageRisk - lastPr.risk).toFixed(2)
          direction = difference > 0 ? DOWN : UP
          difference = difference > 0 ? `+${difference}` : `-${difference}`
          titleDifferenceLatestMergedPr = difference > 0 ? 'Risk increased from previous PR' : 'Risk decreased from previous PR'
        }
        setRiskImpactLatestMergedPr({
          title: 'Risk Impact of latest merged PR',
          value: averageRisk > 0 ? averageRisk : '-',
          unit: '%',
          difference,
          titleDifference: titleDifferenceLatestMergedPr,
          direction
        })

        setOverallRiskMerkedPrToDate({
          title: 'Overall risk of merged PRs to date',
          value: averageRiskMergedPr > 0 ? averageRiskMergedPr : '-',
          unit: '%',
          difference: '-',
          titleDifference: 'Risk increased',
          direction: STALE
        })
      } else {
        setRiskImpactLatestMergedPr({
          title: 'Risk Impact of latest merged PR',
          value: '-',
          unit: '%',
          difference: '-',
          titleDifference: '',
          direction: STALE
        })

        setOverallRiskMerkedPrToDate({
          title: 'Overall risk of merged PRs to date',
          value: '-',
          unit: '%',
          difference: '-',
          titleDifference: 'Risk increased',
          direction: STALE
        })
      }
    }
  }, [previewsLoaded, previews.length])

  useEffect(() => {
    if (timerInterval !== null && timer >= REFRESH_INTERVAL_APPLICATIONS / 1000) {
      async function loadPreviews () {
        const previews = await getApiPreviews()
        setPreviews(previews)
        setLatestRefresDate(new Date())
      }
      loadPreviews()
    }
  }, [timerInterval, timer])

  function startTimer () {
    setTimerInterval(setInterval(() => {
      setTimer((time) => {
        if (time === 0) {
          return REFRESH_INTERVAL_APPLICATIONS / 1000
        } else return time - 1
      })
    }, 1000))
  }

  function handleCloseModalSynchronizeTaxonomy () {
    setTaxonomyToSynchronizeSelected(null)
    setShowModalSynchronizeTaxonomy(false)
  }
  function handleOpenModalSynchronizeTaxonomy (preview) {
    setTaxonomyToSynchronizeSelected(preview)
    setShowModalSynchronizeTaxonomy(true)
  }

  function handleViewDetailPreview (preview) {
    navigate(PREVIEWS_DETAIL_PATH.replace(':taxonomyId', preview.taxonomyId))
  }

  async function handleConfirmSynchronizeTaxonomy () {
    try {
      const { body } = await callApiSynchronizePreviewTaxonomy(taxonomyToSynchronizeSelected.taxonomyId)
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
      setTaxonomyToSynchronizeSelected(null)
      setShowModalSynchronizeTaxonomy(false)
    }
  }

  if (showErrorComponent) {
    return (
      <ErrorComponent
        error={error} message={error.message} onClickDismiss={() => {
          setShowErrorComponent(false)
          setPreviewsLoaded(false)
        }}
      />
    )
  }

  return (
    <>
      <div className={styles.previewsContainer} ref={ref}>
        <div className={styles.previewsContent}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.CodeTestingIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Previews</p>
          </div>
          {statusOpen
            ? (
              <div className={styles.metricsContainer}>
                <PreviewsMetric
                  {...riskImpactLatestMergedPr}
                  valuesLoaded={riskImpactLatestMergedPr !== null}
                />
                <PreviewsMetric
                  {...overallRiskMerkedPrToDate}
                  valuesLoaded={overallRiskMerkedPrToDate !== null}
                />
                <RiskOpenPrs
                  title='Risks of Open PRs'
                  previewsLoaded={previewsLoaded}
                  previewsOpen={previews.filter(pr => pr.open === true)}
                  key={`risk-open-prs-${latestRefreshDate.toISOString()}`}
                />
              </div>)
            : (
              <ClosedRiskChart
                closedPreviews={previews.filter(pr => pr.open === false).filter(preview => preview.risk !== undefined)}
              />)}

          <TablePreviews
            key={`table-previews-${latestRefreshDate.toISOString()}`}
            previewsLoaded={previewsLoaded}
            previews={previews}
            onClickViewDetail={handleViewDetailPreview}
            statusOpen={statusOpen}
            setStatusOpen={setStatusOpen}
            onClickSynchronize={handleOpenModalSynchronizeTaxonomy}
            mainGeneration={mainGeneration}
          />
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
            generationCurrent={(taxonomyToSynchronizeSelected?.taxonomyGeneration ?? '-')}
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

export default Previews
