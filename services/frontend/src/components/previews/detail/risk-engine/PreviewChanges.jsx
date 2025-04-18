import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { BorderedBox, HorizontalSeparator, PlatformaticIcon, Tag } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { ERROR_RED, MAIN_GREEN, OPACITY_30, SMALL, TERTIARY_BLUE, TRANSPARENT, WHITE, NIGHT, MARGIN_0, BLACK_RUSSIAN, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import styles from './PreviewChanges.module.css'
import ChangesMermaid from './ChangesMermaid'
import Icons from '@platformatic/ui-components/src/components/icons'

function ChangeDiff ({ before = '', after = '' }) {
  before = `${before}\n`
  after = `${after}\n`
  return (
    <ReactDiffViewer
      oldValue={before} newValue={after}
      splitView={false}
      hideLineNumbers
      compareMethod='diffCss'
      styles={{
        variables: {
          light: {
            diffViewerBackground: 'transparent',
            diffViewerColor: 'white',
            addedColor: 'white',
            removedColor: 'white',
            wordAddedBackground: 'rgba(33,250,144, 0.3)',
            wordRemovedBackground: 'rgba(255, 33, 33, 0.3)'
          },
          dark: {
            diffViewerBackground: 'transparent',
            diffViewerColor: 'white',
            addedColor: 'white',
            removedColor: 'white',
            wordAddedBackground: 'rgba(33, 250,144, 0.3)',
            wordRemovedBackground: 'rgba(255, 33, 33, 0.3)'
          }
        },
        diffAdded: {
          background: 'rgba(33, 250,144, 0.3)'
        },
        diffRemoved: {
          background: 'rgba(255, 33, 33, 0.3)'
        }
      }}
    />
  )
}

const getTracesImpactedChart = (tracesImpacted) => {
  let chart = 'graph LR;\n'
  for (let i = 0; i < tracesImpacted.length; i++) {
    const impactedServiceOperations = tracesImpacted[i] || []
    chart += `START${i}[ ]`
    for (const impactedOperation of impactedServiceOperations) {
      const telemetryName = impactedOperation.telemetryName
      const { method, path } = impactedOperation.operation
      chart += `-- "${method} ${path}" --> ${telemetryName}(${telemetryName})\n`
    }
    chart += `style START${i} fill:#FFFFFF00, stroke:#FFFFFF00\n` // Removes the start node
  }
  return chart
}

const TracesImpacted = ({ tracesImpacted }) => {
  if (!tracesImpacted || tracesImpacted.length === 0) return (<></>)
  const chart = getTracesImpactedChart(tracesImpacted)

  return (

    <BorderedBox classes={`${styles.tracesImpactedBordereredBox} ${commonStyles.smallFlexBlock}`} backgroundColor={RICH_BLACK} color={TRANSPARENT}>
      <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} `}>Impacted operation traces:</p>
      <div className={styles.chartTraceContainer}>
        <ChangesMermaid key={new Date().toISOString()} chart={chart} />
      </div>
    </BorderedBox>
  )
}

const OperationChanges = ({ operationChanges }) => {
  const changesType = operationChanges.type

  if (changesType === 'deletion') {
    return (
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Removed route OpenApi schema:</p>
        <pre className={`${commonStyles.fullWidth} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
          <ChangeDiff before={JSON.stringify(operationChanges.data, null, 2)} />
        </pre>
      </div>
    )
  }

  if (changesType === 'addition') {
    return (
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Added route OpenApi schema:</p>
        <pre className={`${commonStyles.fullWidth} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
          <ChangeDiff after={JSON.stringify(operationChanges.data, null, 2)} />
        </pre>
      </div>
    )
  }

  if (changesType === 'modification') {
    return (
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>OpenAPI Schema changes:</p>

        {operationChanges.additions?.map((addition, i) => {
          return (
            <div key={addition.jsonPath + '_' + i + '_addition'} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>JSON path: </p>
              <Tag
                text={addition.jsonPath}
                textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
                backgroundColor={WHITE}
                bordered={false}
                opaque={OPACITY_30}
                paddingClass={styles.paddingCode}
              />
              <pre className={`${commonStyles.fullWidth} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
                <ChangeDiff after={JSON.stringify(addition.data, null, 2)} />
              </pre>
            </div>
          )
        })}
        {operationChanges.deletions?.map((deletion, i) => {
          return (
            <div key={deletion.jsonPath + '_' + i + '_deletion'} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>JSON path:</p>
              <Tag
                text={deletion.jsonPath}
                textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
                backgroundColor={WHITE}
                bordered={false}
                opaque={OPACITY_30}
                paddingClass={styles.paddingCode}
              />
              <pre className={`${commonStyles.fullWidth} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
                <ChangeDiff before={JSON.stringify(deletion.data, null, 2)} />
              </pre>
            </div>
          )
        })}
        {operationChanges.modifications?.map((modification, i) => {
          return (
            <div key={modification.jsonPath + '_' + i + '_modification'} className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}> JSON path:</p>
              <Tag
                text={modification.jsonPath}
                textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
                backgroundColor={WHITE}
                bordered={false}
                opaque={OPACITY_30}
                paddingClass={styles.paddingCode}
              />
              <pre className={`${commonStyles.fullWidth} ${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
                <ChangeDiff
                  before={modification.before}
                  after={modification.after}
                />
              </pre>
            </div>
          )
        })}
      </div>
    )
  }

  throw new Error(`Unsupported changes type: ${changesType}`)
}

function DatabaseChange ({ name = '-', elements = [], tagTable = {}, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <BorderedBox color={TRANSPARENT} backgroundColor={NIGHT} backgroundColorOpacity={OPACITY_30} classes={styles.boxDbChange}>
      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Icons.TableIcon color={WHITE} size={SMALL} />
            <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{name}</span>
            {elements.length > 0 && (<span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({elements.length} column{elements.length > 1 ? 's' : ''} changes)</span>)}

            {tagTable.label &&
              <Tag
                text={tagTable.label.toUpperCase()}
                textClassName={tagTable.labelClassName}
                backgroundColor={tagTable.backgroundColor}
                bordered={false}
                opaque={OPACITY_30}
                fullRounded
                platformaticIcon={{ iconName: tagTable.iconName, color: tagTable.iconColor, size: SMALL }}
                paddingClass={styles.paddingTagChange}
              />}
          </div>
          <PlatformaticIcon internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpanded(!expanded)} />
        </div>
        {elements.length > 0 && elements[0].columns.length > 0 && expanded && (
          <>
            <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />
            <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
              {elements.map((element, index) => (
                <div className={`${commonStyles.tinyFlexRow} ${styles.rowContainer}`} key={index}>
                  <BorderedBox bordered={false} backgroundColor={element.backgroundColor} backgroundColorOpacity={OPACITY_30} classes={styles.boxType}>
                    {element.icon}
                  </BorderedBox>
                  <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{element.columns[0]}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </BorderedBox>
  )
}

function getIcon (type) {
  if (type === 'remove') {
    return {
      backgroundColor: ERROR_RED,
      icon: <Icons.RemoveIcon size={SMALL} color={ERROR_RED} />
    }
  }
  if (type === 'create') {
    return {
      backgroundColor: MAIN_GREEN,
      icon: <Icons.AddIcon size={SMALL} color={MAIN_GREEN} />
    }
  }
  return {
    backgroundColor: TERTIARY_BLUE,
    icon: <Icons.SwitchIcon size={SMALL} color={TERTIARY_BLUE} />
  }
}

function DatabaseChanges ({ tables = [] }) {
  let found
  const updatedChanges = tables.reduce((acc, current) => {
    found = acc.find(el => el.name === current.name)

    const { icon, backgroundColor } = getIcon(current.type)
    if (found) {
      delete found.tagTable
      found.elements.push({
        icon,
        columns: current.columns || [],
        backgroundColor
      })
    } else {
      acc.push({
        name: current.name,
        elements: [{
          icon,
          columns: current.columns || [],
          backgroundColor
        }],
        tagTable: {
          iconName: current.type === 'change' ? 'EditIcon' : (current.type === 'create' ? 'AddIcon' : 'TrashIcon'),
          label: current.type,
          labelClassName: `${typographyStyles.desktopOtherOverlineSmall} ${current.type === 'change' ? typographyStyles.textTertiaryBlue : (current.type === 'create' ? typographyStyles.textMainGreen : typographyStyles.textErrorRed)}`,
          backgroundColor: current.type === 'change' ? TERTIARY_BLUE : (current.type === 'create' ? MAIN_GREEN : ERROR_RED),
          iconColor: current.type === 'change' ? TERTIARY_BLUE : (current.type === 'create' ? MAIN_GREEN : ERROR_RED)
        }
      })
    }
    return acc
  }, [])

  if (updatedChanges.length === 0) {
    return <></>
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Database Table Changes</p>
      </div>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        {updatedChanges.map((change, index) => <DatabaseChange {...change} key={index} defaultExpanded={index === 0} />)}
      </div>
    </div>
  )
}

function PreviewChanges ({
  detailType = '',
  tracesImpacted = [],
  operationChanges = {},
  branchSchema = {},
  mainSchema = {},
  tables = [],
  changes = []
}) {
  const previewChangeRef = useRef(null)

  useEffect(() => {
    if (previewChangeRef.current && detailType) {
      previewChangeRef.current.scrollTo(0, 0)
    }
  }, [previewChangeRef, detailType])

  function Change ({ change }) {
    if (!change) return null
    const message = change.message
    const path = change.path
    return (
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{message}</p>
        <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>path: `{path}`</p>
      </div>
    )
  }

  function renderContent () {
    if (Object.keys(operationChanges).length > 0 && detailType === 'openApiChange') {
      return (
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <TracesImpacted key={new Date().toISOString()} tracesImpacted={tracesImpacted} />
          <OperationChanges operationChanges={operationChanges} />
        </div>
      )
    }
    if (detailType === 'graphQlSchema') {
      return <ChangeDiff before={mainSchema} after={branchSchema} />
    }
    if (detailType === 'openApiOperations') {
      return (
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <TracesImpacted key={new Date().toISOString()} tracesImpacted={tracesImpacted} />
          {changes ? changes.map((change, index) => <Change key={index} change={change} />) : null}
        </div>
      )
    }
    if (detailType === 'dbChange') {
      return (
        <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
          <TracesImpacted key={new Date().toISOString()} tracesImpacted={tracesImpacted} />
          <DatabaseChanges tables={tables} />
        </div>
      )
    }
    return <></>
  }

  return detailType
    ? (
      <BorderedBox
        color={TRANSPARENT}
        backgroundColor={BLACK_RUSSIAN}
        classes={`${commonStyles.halfWidth} ${styles.borderedPreviewChangesContainer} `}
        key={`${detailType}-${new Date().toISOString()}`}
      >
        <div className={commonStyles.fullWidth}>
          {renderContent()}
        </div>
      </BorderedBox>
      )
    : (
      <></>
      )
}

PreviewChanges.propTypes = {
  /**
   * detailType
   */
  detailType: PropTypes.string,
  /**
   * mainSchema
   */
  mainSchema: PropTypes.object,
  /**
   * branchSchema
   */
  branchSchema: PropTypes.object,
  /**
   * tracesImpacted
   */
  tracesImpacted: PropTypes.array,
  /**
   * tables
   */
  tables: PropTypes.array,
  /**
   * changes
   */
  changes: PropTypes.array,
  /**
   * operationChanges
   */
  operationChanges: PropTypes.object
}

export default PreviewChanges
