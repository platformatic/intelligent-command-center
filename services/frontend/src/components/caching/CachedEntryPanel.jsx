/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import styles from './CachedEntryPanel.module.css'
import CachedEntryPanelBlock from './CachedEntryPanelBlock'
import CacheDependencyTree from './CacheDependencyTree'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import IconArrow from './IconArrow'
import { Button, PlatformaticIcon, Tooltip } from '@platformatic/ui-components'
import { ERROR_RED, MEDIUM, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import tooltipStyles from '~/styles/TooltipStyles.module.css'
import dayjs from 'dayjs'
import InternetIcon from '@platformatic/ui-components/src/components/icons/InternetIcon'
import NextJSIcon from '@platformatic/ui-components/src/components/icons/NextJSIcon'
import HeadersTable from './HeadersTable'
import CachedEntryDependentsPanelBlock from './CachedEntryDependentsPanelBlock'

function KeyValue ({ label, value }) {
  return (
    <div className={styles.keyValue}>
      <span className={styles.key}>{label}:&nbsp;</span>
      <span className={styles.value}>{value}</span>
    </div>
  )
}
export default function CachedEntryPanel ({
  entry,
  onClose = () => {},
  onInvalidate = () => {}
}) {
  const [valueCopied, setValueCopied] = useState(false)
  function copyValue (value) {
    setValueCopied(true)
    if (value instanceof Object) {
      navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    } else {
      navigator.clipboard.writeText(value)
    }
    setTimeout(() => {
      setValueCopied(false)
    }, 1000)
  }

  async function onInvalidateClicked () {
    onInvalidate(entry)
  }
  function formatCacheTimestamps (ts) {
    return dayjs(ts).format('YYYY-MM-DD')
  }

  function renderIcon () {
    if (entry.kind === 'HTTP_CACHE') {
      return <InternetIcon color='white' />
    }
    return <NextJSIcon color='white' />
  }

  function renderContentPreview () {
    if (entry.headers['content-encoding']?.startsWith('gzip') ||
        entry.kind === 'NEXT_CACHE_PAGE') {
      // do not render
      return 'Cannot Display file preview. Download it.'
    }

    let payload = entry.body
    try {
      payload = JSON.stringify(JSON.parse(payload), null, 2)
    } catch {}

    return (
      <div className={`${typographyStyles.desktopOtherCliTerminalSmall} ${styles.contentPreview}`}>
        <pre>{payload}</pre>
      </div>
    )
  }

  function downloadFile () {
    let filename
    if (entry.headers['content-encoding']?.startsWith('gzip')) {
      filename = `${entry.id}.gzip`
    } else if (entry.headers['content-type']?.startsWith('application/json')) {
      filename = `${entry.id}.json`
    } else if (entry.kind === 'NEXT_CACHE_PAGE') {
      filename = `${entry.id}.html`
    } else {
      filename = `${entry.id}.${entry.headers['content-type'].split('/')[1]}`
    }

    const url = window.URL.createObjectURL(
      new Blob([entry.body])
    )
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)

    // Append to html link element page
    document.body.appendChild(link)

    // Start download
    link.click()

    // Clean up and remove the link
    link.parentNode.removeChild(link)
  }

  function getEndpoint () {
    if (entry.kind === 'NEXT_CACHE_PAGE') {
      return `GET ${entry.route}`
    }
    return `${entry.method} ${entry.path}`
  }

  function renderKind () {
    switch (entry.kind) {
      case 'HTTP_CACHE':
        return ''
      case 'NEXT_CACHE_FETCH':
        return <span className={`${styles.kind} ${typographyStyles.desktopBodyLarge}`}>(component)</span>
      case 'NEXT_CACHE_PAGE':
        return <span className={`${styles.kind} ${typographyStyles.desktopBodyLarge}`}>(page)</span>
    }
  }

  formatCacheTimestamps(entry.cachedAt)

  const showDependencyTree = entry.kind === 'HTTP_CACHE'

  return (
    <div className={styles.container}>
      <div className={styles.entry}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${styles.title}`}>
          {renderIcon()}
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>
            Cache Entry
          </p>
          {renderKind()}
        </div>
        <div className={styles.closeButton}>
          <PlatformaticIcon
            color={WHITE}
            iconName='CloseIcon'
            size={MEDIUM}
            onClick={onClose}
            internalOverHandling
          />
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.header}>

          <div className={styles.data}>
            <div>{getEndpoint()}</div>
            {entry.headers.etag && <KeyValue label='ETag' value={entry.headers.etag} />}
            <div className={styles.expiration}>
              <div>
                <KeyValue label='Created on' value={formatCacheTimestamps(entry.cachedAt)} />
                <IconArrow />
                <KeyValue label='Expires on' value={formatCacheTimestamps(entry.deletedAt)} />
              </div>
              <Button
                type='button'
                label='Invalidate Cache'
                onClick={onInvalidateClicked}
                color={ERROR_RED}
                backgroundColor={TRANSPARENT}
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
              />
            </div>

          </div>

        </div>
        <Tooltip
          tooltipClassName={tooltipStyles.tooltipDarkStyle}
          visible={valueCopied}
          content={(<span>Value copied!</span>)}
          offset={4}
          activeDependsOnVisible
        />

        {showDependencyTree &&
          <CacheDependencyTree entry={entry} />}

        <div className={styles.block}>
          <CachedEntryPanelBlock onClipboardClick={() => copyValue(entry.id)} title='Key' downloadable={false}>
            <div className={`${typographyStyles.ellipsis} ${typographyStyles.desktopOtherCliTerminalSmall} ${styles.entryId}`}>
              {entry.id}
            </div>

          </CachedEntryPanelBlock>
          <CachedEntryPanelBlock onClipboardClick={() => copyValue(entry.headers)} title='Headers' downloadable={false}>
            <div className={typographyStyles.desktopOtherCliTerminalSmall}>
              <HeadersTable headers={entry.headers} />
            </div>

          </CachedEntryPanelBlock>
          <CachedEntryPanelBlock onDownload={() => downloadFile()} title='Response' downloadable>
            {renderContentPreview()}
          </CachedEntryPanelBlock>

          {entry?.dependents?.length > 0 &&
            <CachedEntryDependentsPanelBlock dependents={entry.dependents} />}
        </div>

      </div>

    </div>
  )
}
