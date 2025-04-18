import React, { useState, useEffect, useRef } from 'react'
import {
  WHITE,
  RICH_BLACK,
  DULLS_BACKGROUND_COLOR,
  TRANSPARENT,
  MEDIUM,
  SMALL,
  MODAL_FULL_RICH_BLACK_V2,
  DIRECTION_RIGHT
} from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './Imports.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { BorderedBox, Button, Modal, Tooltip, Forms } from '@platformatic/ui-components'
import ErrorComponent from '~/components/errors/ErrorComponent'
import ImportTable from './ImportTable'
import ToBeImported from './ToBeImported'
import Paginator from '~/components/ui/Paginator'
import Detail from './Detail'
import { callApiGetSyncImports, callApiGetSyncAvailableImports } from '~/api'
import { setSyncConfig, getCurrentSync } from '~/api/system-jobs'
import Importing from './Importing'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'

function Imports ({ config = {} }) {
  const [loaded, setLoaded] = useState(false)
  const [reload, setReload] = useState(true)
  const [importData, setImportData] = useState([])
  const [toBeImportedData, setToBeImportedData] = useState([])
  const [error, setError] = useState(null)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [dataPage, setDataPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [importDetail, setImportDetail] = useState(null)
  const [showImporting, setShowImporting] = useState(false)
  const [selectedSyncOption, setSelectedSyncOption] = useState(null)

  const LIMIT = 10

  const { target } = config
  const selectRef = useRef(null)

  const adjustSelectWidth = (label) => {
    const dummy = document.createElement('div')
    dummy.innerText = label
    dummy.style.position = 'absolute'
    dummy.style.visibility = 'hidden'
    document.body.insertBefore(dummy, document.body.firstChild)
    const measuredWidth = dummy.clientWidth
    document.body.removeChild(dummy)
    const select = selectRef?.current
    if (select) {
      select.style.width = measuredWidth + 'px'
      select.style.minWidth = '150px'
    }
  }

  const getSelectLabel = (syncValue) => {
    const { value, when } = syncValue
    let label
    const stringValues = {
      '24H': 'Every 24 hours',
      '1W': 'Every Week',
      '1M': 'Every Month'
    }
    if (value === 'OFF') {
      label = 'Auto Import OFF'
    } else {
      const stringValue = stringValues[value]
      label = `Auto Import: ${stringValue}. Next on: ${getFormattedTimeAndDate(when)} (UTC)`
    }
    adjustSelectWidth(label)
    return label
  }

  useEffect(() => {
    if (reload) {
      setLoaded(false)
      async function loadData () {
        try {
          const response = await callApiGetSyncImports({ limit: LIMIT, offset: dataPage * LIMIT })
          const { data, totalCount } = response
          const { data: availableImports } = await callApiGetSyncAvailableImports() || []
          setToBeImportedData(availableImports)
          setReload(false)
          setLoaded(true)
          setTotalCount(totalCount)
          setImportData(data)
        } catch (error) {
          console.error(`Error on get exports ${error}`)
          setError(error)
          setShowErrorComponent(true)
        }
      }
      loadData()
    }
  }, [loaded, reload, dataPage])

  useEffect(() => {
    setLoaded(false)
    async function loadCurrentSync () {
      try {
        const response = await getCurrentSync()
        const label = getSelectLabel(response)
        setSelectedSyncOption(label)
        adjustSelectWidth(label)
      } catch (error) {
        setError(error)
        setShowErrorComponent(true)
      }
    }
    loadCurrentSync()
  }, [])

  useEffect(() => {
    adjustSelectWidth(selectedSyncOption)
  }, [selectedSyncOption])

  if (showErrorComponent) {
    return (
      <ErrorComponent
        error={error} onClickDismiss={() => {
          setShowImporting(false)
          setReload(true)
          setShowErrorComponent(false)
        }}
      />
    )
  }

  const triggerImport = () => {
    setShowImporting(true)
  }

  if (importDetail) {
    return (
      <div>
        <Modal
          key='importDetail'
          layout={MODAL_FULL_RICH_BLACK_V2}
          setIsOpen={setImportDetail}
          childrenClassContainer={`${styles.modalClassName} `}
          modalCloseClassName={styles.modalCloseClassName}
        >
          <Detail title='Import Detail' data={importDetail} />
        </Modal>
        )
      </div>
    )
  }

  if (showImporting) {
    return (
      <Importing
        config={config}
        onComplete={() => {
          setShowImporting(false)
          setReload(true)
        }}
        onCanceled={() => {
          setShowImporting(false)
          setReload(true)
        }}
        onError={(error) => {
          setError(error)
          setShowErrorComponent(true)
        }}
      />
    )
  }

  const syncOptions = [
    { value: 'OFF', label: 'OFF' },
    { value: '24H', label: 'Every 24 hours' },
    { value: '1W', label: 'Every Week' },
    { value: '1M', label: 'Every Month' }
  ]

  const selectSyncOption = async (evt) => {
    const value = evt.detail.value
    const syncValue = await setSyncConfig(value)
    const label = getSelectLabel(syncValue)
    setSelectedSyncOption(label)
  }

  return (
    <>
      <BorderedBox color={TRANSPARENT} backgroundColor={RICH_BLACK} classes={styles.boxSynch}>
        <div className={`${commonStyles.flexBlockNoGap} ${commonStyles.fullWidth} ${styles.header}`}>
          <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
            <div className={` ${commonStyles.fullWidth} ${styles.leftContainer}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
                <Icons.ImportIcon color={WHITE} size={MEDIUM} />
                <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Import Base Data</p>
              </div>
            </div>

            <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyEnd} ${commonStyles.fullWidth} ${styles.rightContainer}`}>
              {selectedSyncOption &&
                <div
                  className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter}`} ref={selectRef}
                >
                  <Forms.Select
                    defaultContainerClassName={styles.select}
                    backgroundColor={RICH_BLACK}
                    borderColor={WHITE}
                    defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.optionsClass}`}
                    options={syncOptions}
                    onSelect={async (evt) => {
                      selectSyncOption(evt)
                    }}
                    optionsBorderedBottom={false}
                    mainColor={WHITE}
                    borderListColor={WHITE}
                    value={selectedSyncOption}
                    inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
                    paddingClass={styles.selectPaddingClass}
                    handleClickOutside
                    placeholder='Select Sync'
                  />
                </div>}
              <Button
                label='Import now'
                onClick={triggerImport}
                color={RICH_BLACK}
                backgroundColor={WHITE}
                hoverEffect={DULLS_BACKGROUND_COLOR}
                paddingClass={commonStyles.smallButtonPadding}
                textClass={typographyStyles.desktopButtonSmall}
                platformaticIcon={{ iconName: 'ImportIcon', color: RICH_BLACK }}
                bordered={false}
              />
            </div>
          </div>

          <div className={`${commonStyles.smallFlexRow} ${styles.target} `}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>from</span>
            <Icons.AWSIcon color={WHITE} size={SMALL} />
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite}`}>{target}</span>
            <Tooltip
              tooltipClassName={tooltipStyles.tooltipDarkStyle}
              content={(<span>Storage URL and credentials are set in the configuration <br /> during the installation of ICC.</span>)}
              offset={10}
              direction={DIRECTION_RIGHT}
              immediateActive={false}
            >
              <Icons.InfoCircleIcon color={WHITE} size={SMALL} />
            </Tooltip>
          </div>
        </div>

        <ToBeImported
          data={toBeImportedData}
          loaded={loaded}
        />

        <ImportTable
          data={importData}
          loaded={loaded}
          onViewDetail={setImportDetail}
        />
        {importData.length > LIMIT && !reload && (
          <Paginator
            pagesNumber={Math.ceil(totalCount / LIMIT)} onClickPage={(page) => {
              setLoaded(false)
              setReload(true)
              setDataPage(page)
            }} selectedPage={dataPage}
          />
        )}
      </BorderedBox>
    </>
  )
}

export default Imports
