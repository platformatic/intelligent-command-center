import React, { useState } from 'react'
import { SMALL, ACTIVE_AND_INACTIVE_STATUS, TRANSPARENT, WHITE, MEDIUM } from '@platformatic/ui-components/src/components/constants'
import { Button, ModalDirectional, PlatformaticIcon } from '@platformatic/ui-components'
import StatusPill from './StatusPill'
import CallbackUrl from './CallbackUrl'
import { getFormattedTimeAndDate } from '../../utilities/dates'
import ResponsePanel from '../common/ResponsePanel'
import { copyValue, downloadFile } from '../../utils'
import NoDataFound from '~/components/ui/NoDataFound'

import styles from './MessageTable.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'

/**
 * @typedef {Object} Message
 * @property {string} sentAt - The timestamp when the message was sent
 * @property {string} status - The status of the message (success, error, warning)
 * @property {Object} headers - The headers sent with the message
 * @property {Object} body - The body of the message
 * @property {Object} responseHeaders - The headers received in response
 * @property {Object} responseBody - The body received in response
 */

function MessageDetails ({ message, onClose, jobDetails }) {
  function renderContentPreview () {
    let payload = message.responseBody
    try {
      payload = JSON.stringify(payload, null, 2)
    } catch {}
    if (payload.length === 0) {
      payload = 'No response body'
    }
    return (
      <div className={`${typographyStyles.desktopOtherCliTerminalSmall} ${styles.contentPreview}`}>
        <pre>{payload}</pre>
      </div>
    )
  }
  function renderHeaders (headers) {
    if (!headers) return null
    return Object.entries(headers).map(([key, value]) => (
      <div key={key} className={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite}`}>
        {key.toLowerCase()}: {value}
      </div>
    ))
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <h3 className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite} ${styles.messageDetailsHeader}`}>
        <PlatformaticIcon iconName='ScheduledJobsDetailIcon' color={WHITE} size={MEDIUM} />
        {getFormattedTimeAndDate(message.when)}
        <StatusPill status={message.failed ? 'failed' : 'success'} />
      </h3>
      <div className={styles.targetEndpoint}>
        <span>Target Endpoint</span>: <CallbackUrl method={jobDetails.method} url={jobDetails.callbackUrl} />
      </div>

      <ResponsePanel
        title='Headers' downloadable={false} onClipboardClick={() => copyValue(message.headers)}
      >
        {renderHeaders(message.headers)}
      </ResponsePanel>

      <ResponsePanel
        title='Body' downloadable={false} onClipboardClick={() => copyValue(message.body)}
      >
        <div className={`${typographyStyles.desktopOtherCliTerminalSmall} ${typographyStyles.textWhite} ${styles.codeBlock}`}>
          {JSON.stringify(message.body, null, 2)}
        </div>
      </ResponsePanel>

      <ResponsePanel title='Response Headers' downloadable={false} onClipboardClick={() => copyValue(message.responseHeaders)}>
        {renderHeaders(message.responseHeaders)}
      </ResponsePanel>
      <ResponsePanel title='Response Body' downloadable onDownload={() => downloadFile({ headers: message.responseHeaders, id: message.id, body: message.responseBody })}>
        {renderContentPreview()}
      </ResponsePanel>
    </div>

  )
}

export default function MessageTable ({ messages, jobDetails }) {
  const [selectedMessage, setSelectedMessage] = useState(null)

  const columns = [
    {
      label: 'Sent At',
      key: 'sentAt'
    },
    {
      label: 'Status',
      key: 'status'
    },
    {
      label: 'Target Endpoint',
      key: 'callbackUrl'
    }
  ]

  function renderColumn (message, column) {
    switch (column.key) {
      case 'status':
        return <StatusPill status={message.failed ? 'failed' : 'success'} />
      case 'sentAt':
        return <div className={styles.noPadding}>{getFormattedTimeAndDate(message.when)}</div>
      case 'callbackUrl':
        return <CallbackUrl method={jobDetails.method} url={message.callbackUrl} />
      default:
        return message[column.key] || '-'
    }
  }
  if (messages.length === 0) {
    return (
      <NoDataFound fullCentered title='No messages found' />
    )
  }
  return (
    <>
      <div className={styles.container}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {messages.map((message, idx) => (
              <tr key={idx}>
                {columns.map((column, idx) => (
                  <td key={idx} className={typographyStyles.desktopBodySmallSemibold}>{renderColumn(message, column)}</td>
                ))}
                <td className={styles.viewDetailsButton}>
                  <Button
                    label='View Details'
                    type='button'
                    color={WHITE}
                    backgroundColor={TRANSPARENT}
                    hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
                    paddingClass={commonStyles.smallButtonPadding}
                    textClass={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite}`}
                    onClick={() => setSelectedMessage(message)}
                    bordered={false}
                    platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMessage && (
        <ModalDirectional
          classNameModalLefty={styles.modal}
          key='messageDetails'
          setIsOpen={() => setSelectedMessage(null)}
          permanent
        >
          <MessageDetails
            message={selectedMessage}
            onClose={() => setSelectedMessage(null)}
            jobDetails={jobDetails}
          />
        </ModalDirectional>
      )}
    </>
  )
}
