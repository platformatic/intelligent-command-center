import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { BorderedBox, PlatformaticIcon, Tag, VerticalSeparator } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import { OPACITY_30, OPACITY_100, RICH_BLACK, SMALL, WHITE, BLACK_RUSSIAN, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'
import styles from './Changes.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'

// In GraphQL we have to list all the changes first, because we don't have the concept of "operations"
// i.e. is we change a type, all the queries and mutations that use that type will be impacted
const DBChanges = ({ dbChanges, onClickViewDetail, triggerOnClickViewDetail = false }) => {
  const [expanded, setExpanded] = useState(true)
  return (
    <BorderedBox
      color={TRANSPARENT}
      backgroundColor={BLACK_RUSSIAN}
      classes={`${commonStyles.fullWidth} ${commonStyles.smallFlexBlock}`}
    >
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
          <Icons.DatabaseEditIcon color={WHITE} size={SMALL} />
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>DB changes</p>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({dbChanges.length ?? 0})</span>
        </div>
        <PlatformaticIcon internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpanded(!expanded)} />
      </div>

      {dbChanges.map(dbChange => {
        const tracesImpacted = dbChange.tracesImpacted
        const tables = dbChange.tables

        if (triggerOnClickViewDetail) {
          onClickViewDetail('dbChange', { tracesImpacted, tables })
        }
        if (Object.keys(tracesImpacted).length === 0 && tables.length === 0) {
          return (<React.Fragment key={`${dbChange.host}-${dbChange.port}-${dbChange.dbName}-container`} />)
        }
        return (
          <div key={`${dbChange.host}-${dbChange.port}-${dbChange.dbName}-container`} className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>

            {expanded && (
              <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
                <BorderedBox
                  color={TRANSPARENT}
                  backgroundColor={RICH_BLACK}
                  classes={`${styles.borderexBoxOpenApiChanges} ${commonStyles.fullWidth} `}
                  key={`${dbChange.host}-${dbChange.port}-${dbChange.dbName}`}
                  internalOverHandling
                  borderColorOpacityOver={OPACITY_100}
                  backgroundColorOpacityOver={OPACITY_30}
                  backgroundColorOver={WHITE}
                  clickable
                  onClick={() => onClickViewDetail('dbChange', { tracesImpacted, tables })}
                >

                  <div className={`${commonStyles.smallFlexRow}  ${commonStyles.justifyBetween}`}>
                    <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${styles.dbChangeRow}`}>
                      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${styles.host}`}>
                        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{dbChange?.host ?? '-'}</span>
                      </div>
                      {dbChange?.port && (
                        <>
                          <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />
                          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{dbChange?.port}</span>
                        </>
                      )}
                      <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />
                      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${styles.dbname}`}>
                        <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{dbChange?.dbName ?? '-'}</span>
                      </div>
                    </div>
                    <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                      <PlatformaticIcon
                        iconName='InternalLinkIcon' color={WHITE} size={SMALL} internalOverHandling
                      />
                    </div>
                  </div>
                </BorderedBox>
              </div>
            )}
          </div>
        )
      })}

    </BorderedBox>
  )
}

const OpenAPIChange = ({ service, index, onClickViewDetail, triggerOnClickViewDetail = false }) => {
  const [expanded, setExpanded] = useState(true)
  function generateOperationChangeTitle (operationDetails, changesType) {
    const { protocol, method, path } = operationDetails

    if (protocol === 'http') {
      if (changesType === 'deletion') {
        return (
          <>
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{method.toUpperCase()}</span>
            <Tag
              text={path}
              textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
              backgroundColor={WHITE}
              bordered={false}
              opaque={OPACITY_30}
              paddingClass={styles.paddingCode}
            />
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>route has been deleted</span>
          </>
        )
      }
      if (changesType === 'addition') {
        return (
          <>
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{method.toUpperCase()}</span>
            <Tag
              text={path}
              textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
              backgroundColor={WHITE}
              bordered={false}
              opaque={OPACITY_30}
              paddingClass={styles.paddingCode}
            />
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>route has been added</span>
          </>
        )
      }
      if (changesType === 'modification') {
        return (
          <>
            <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{method.toUpperCase()}</span>
            <Tag
              text={path}
              textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
              backgroundColor={WHITE}
              bordered={false}
              opaque={OPACITY_30}
              paddingClass={styles.paddingCode}
            />
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>route has been modified</span>
          </>

        )
      }
      throw new Error(`Unsupported changes type: ${changesType}`)
    }
    throw new Error(`Unsupported operation protocol: ${protocol}`)
  }

  return (
    <div key={service.telemetryName} className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
          <Icons.OpenAPIEditsIcon color={WHITE} size={SMALL} />
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>OpenAPI Changes</p>
          <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({service?.operations?.length ?? 0})</span>
        </div>
        <PlatformaticIcon internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpanded(!expanded)} />
      </div>

      {expanded && (
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          {service.operations.map((operation, opIndex) => {
            const operationDetails = operation.operation
            const changesType = operation?.changes?.type

            const operationChangeTitle = generateOperationChangeTitle(operationDetails, changesType)
            const tracesImpacted = operation.tracesImpacted
            const operationChanges = operation.changes

            if (triggerOnClickViewDetail && opIndex === 0) {
              onClickViewDetail({ tracesImpacted, operationChanges })
            }

            return (
              <BorderedBox
                color={TRANSPARENT}
                backgroundColor={RICH_BLACK}
                classes={`${styles.borderexBoxOpenApiChanges} ${commonStyles.fullWidth} `}
                key={operationDetails.path + '_' + index + '_' + opIndex}
                internalOverHandling
                borderColorOpacityOver={OPACITY_100}
                backgroundColorOpacityOver={OPACITY_30}
                backgroundColorOver={WHITE}
                clickable
                onClick={() => onClickViewDetail({ tracesImpacted, operationChanges })}
              >
                <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyBetween}`}>
                  <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyBetween}`}>
                    {operationChangeTitle}
                  </div>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                    <PlatformaticIcon iconName='InternalLinkIcon' color={WHITE} size={SMALL} internalOverHandling />
                  </div>
                </div>
              </BorderedBox>
            )
          })}
        </div>
      )}
    </div>
  )
}
const OpenAPIChanges = ({ openAPIServices, onClickViewDetail }) => {
  return (
    <BorderedBox
      color={TRANSPARENT}
      backgroundColor={BLACK_RUSSIAN}
      classes={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}
    >
      {openAPIServices.map((service, i) => <OpenAPIChange key={`open_api_service_${i}`} service={service} index={i} onClickViewDetail={onClickViewDetail} />)}
    </BorderedBox>
  )
}

// In GraphQL we have to list all the changes first, because we don't have the concept of "operations"
// i.e. is we change a type, all the queries and mutations that use that type will be impacted
const GraphQLChanges = ({ graphQLServices, onClickViewDetail, triggerOnClickViewDetail = false }) => {
  const [expanded, setExpanded] = useState(true)

  function generateGraphQLOperationChangeTitle (operationDetails) {
    const { method, path } = operationDetails
    if (method === 'QUERY') {
      return (
        <>
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{method.toUpperCase()}</span>
          <Tag
            text={path}
            textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
            backgroundColor={WHITE}
            bordered={false}
            opaque={OPACITY_30}
            paddingClass={styles.paddingCode}
          />
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>query was modified</span>
        </>
      )
    } else if (method === 'MUTATION') {
      return (
        <>
          <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{method.toUpperCase()}</span>
          <Tag
            text={path}
            textClassName={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}
            backgroundColor={WHITE}
            bordered={false}
            opaque={OPACITY_30}
            paddingClass={styles.paddingCode}
          />
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>mutation was modified</span>
        </>
      )
    } else {
      throw new Error(`Unsupported method: ${method}`)
    }
  }
  return (
    <>
      {graphQLServices.map(service => {
        const branchSchema = service.schemas.source
        const mainSchema = service.schemas.target
        const queries = service.operations.filter(operation => operation.operation.method === 'QUERY')
        const mutations = service.operations.filter(operation => operation.operation.method === 'MUTATION')
        if (triggerOnClickViewDetail) {
          onClickViewDetail('graphQlSchema', { branchSchema, mainSchema })
        }
        return (
          <div key={service.telemetryName} className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
            <BorderedBox
              color={TRANSPARENT}
              backgroundColor={BLACK_RUSSIAN}
              classes={`${commonStyles.fullWidth} ${commonStyles.smallFlexBlock}`}
            >
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
                <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
                  <Icons.GraphQLEditsIcon color={WHITE} size={SMALL} />
                  <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>GraphQL Changes</p>
                </div>
              </div>
              <BorderedBox
                color={TRANSPARENT}
                backgroundColor={RICH_BLACK}
                classes={`${styles.borderexBoxOpenApiChanges} ${commonStyles.fullWidth} `}
                internalOverHandling
                borderColorOpacityOver={OPACITY_100}
                backgroundColorOpacityOver={OPACITY_30}
                backgroundColorOver={WHITE}
                clickable
                onClick={() => onClickViewDetail('graphQlSchema', { branchSchema, mainSchema })}
              >
                <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyBetween}`}>
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
                    Schema Change
                  </p>
                  <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>

                    <PlatformaticIcon iconName='InternalLinkIcon' color={WHITE} size={SMALL} internalOverHandling />
                  </div>
                </div>
              </BorderedBox>
            </BorderedBox>

            <BorderedBox
              color={TRANSPARENT}
              backgroundColor={BLACK_RUSSIAN}
              classes={`${commonStyles.fullWidth} ${commonStyles.smallFlexBlock}`}
            >
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
                <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
                  <Icons.OpenAPIEditsIcon color={WHITE} size={SMALL} />
                  <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>OpenAPI Operations</p>
                  <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>({queries.concat(mutations).length ?? 0})</span>
                </div>
                <PlatformaticIcon internalOverHandling iconName={!expanded ? 'ArrowRightIcon' : 'ArrowDownIcon'} color={WHITE} size={SMALL} onClick={() => setExpanded(!expanded)} />
              </div>

              {expanded && (
                <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>

                  {queries.concat(mutations).map(query => {
                    const queryDetails = query.operation
                    const tracesImpacted = query.tracesImpacted

                    const graphQLOperationChangeTitle = generateGraphQLOperationChangeTitle(queryDetails)

                    return (
                      <BorderedBox
                        color={TRANSPARENT}
                        backgroundColor={RICH_BLACK}
                        classes={`${styles.borderexBoxOpenApiChanges} ${commonStyles.fullWidth} `}
                        key={queryDetails.path}
                        internalOverHandling
                        borderColorOpacityOver={OPACITY_100}
                        backgroundColorOpacityOver={OPACITY_30}
                        backgroundColorOver={WHITE}
                        clickable
                        onClick={() => onClickViewDetail('openApiOperations', { tracesImpacted, changes: query.changes })}
                      >
                        <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyBetween}`}>
                          <div className={`${commonStyles.smallFlexRow} ${commonStyles.justifyBetween}`}>
                            {graphQLOperationChangeTitle}
                          </div>
                          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                            <PlatformaticIcon iconName='InternalLinkIcon' color={WHITE} size={SMALL} internalOverHandling />
                          </div>
                        </div>
                      </BorderedBox>
                    )
                  })}
                </div>
              )}
            </BorderedBox>
          </div>
        )
      })}
    </>
  )
}

function Changes ({
  openapi = {},
  graphql = {},
  dbChanges = [],
  onClickViewDetail = () => {}
}) {
  const [triggerOnClickViewDetail, setTriggerOnClickViewDetail] = useState(true)
  const openAPIServices = openapi?.services || []
  const graphQLServices = graphql?.services || []

  const hasOpenAPIChanges = openAPIServices.length > 0
  const hasGraphQLChanges = graphQLServices.length > 0
  const hasDBChanges = dbChanges.length > 0

  function onClickViewDetailOpenApiChanges (payload) {
    setTriggerOnClickViewDetail(false)
    return onClickViewDetail('openApiChange', payload)
  }

  function onClickViewDetailGraphQLChanges (detail, payload) {
    setTriggerOnClickViewDetail(false)
    return onClickViewDetail(detail, payload)
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.halfWidth} ${styles.changesContainer}`}>
      {hasOpenAPIChanges && <OpenAPIChanges openAPIServices={openAPIServices} onClickViewDetail={onClickViewDetailOpenApiChanges} triggerOnClickViewDetail={hasOpenAPIChanges && triggerOnClickViewDetail} />}
      {hasGraphQLChanges && <GraphQLChanges graphQLServices={graphQLServices} onClickViewDetail={onClickViewDetailGraphQLChanges} triggerOnClickViewDetail={!hasOpenAPIChanges && hasGraphQLChanges && triggerOnClickViewDetail} />}
      {hasDBChanges && <DBChanges dbChanges={dbChanges} onClickViewDetail={onClickViewDetailGraphQLChanges} triggerOnClickViewDetail={!hasDBChanges && hasGraphQLChanges && triggerOnClickViewDetail} />}
    </div>
  )
}

Changes.propTypes = {
  /**
   * openapi
   */
  openapi: PropTypes.object,
  /**
   * graphql
   */
  graphql: PropTypes.object,
  /**
   * dbChanges
   */
  dbChanges: PropTypes.array,
  /**
   * onClickViewDetail
   */
  onClickViewDetail: PropTypes.func
}

export default Changes
