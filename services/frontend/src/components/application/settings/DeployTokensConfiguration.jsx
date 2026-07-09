import React, { useEffect, useState } from 'react'
import {
  TRANSPARENT, BLACK_RUSSIAN, WHITE, MEDIUM, RICH_BLACK,
  ERROR_RED, MAIN_GREEN, WARNING_YELLOW
} from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Forms, Icons, Button } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import StatusPill from '~/components/common/StatusPill'
import Paginator from '~/components/ui/Paginator'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import { getDeployTokens, createDeployToken, revokeDeployToken } from '~/api'
import styles from './DeployTokensConfiguration.module.css'

const DAY_MS = 24 * 60 * 60 * 1000
const LIMIT = 10

const COLUMNS = [
  { key: 'name', label: 'Label' },
  { key: 'createdAt', label: 'Created (GMT)' },
  { key: 'expiresAt', label: 'Expires' },
  { key: 'lastUsedAt', label: 'Last used' },
  { key: 'state', label: 'State' }
]

const EXPIRY_OPTIONS = [
  { label: 'Never', value: '' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' }
]

const STATE_COLORS = { active: MAIN_GREEN, revoked: ERROR_RED, expired: WARNING_YELLOW }

function tokenState (token) {
  if (token.revokedAt) return 'revoked'
  if (token.expiresAt && new Date(token.expiresAt).getTime() < Date.now()) return 'expired'
  return 'active'
}

async function copyToClipboard (text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // navigator.clipboard is unavailable outside secure contexts; fall back.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch { /* clipboard unavailable */ }
    document.body.removeChild(ta)
  }
}

export default function DeployTokensConfiguration ({ applicationId }) {
  const [tokens, setTokens] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState('createdAt')
  const [order, setOrder] = useState('desc')
  const [name, setName] = useState('')
  const [expiryDays, setExpiryDays] = useState('')
  const [revealed, setRevealed] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  async function loadTokens (targetPage = page, sortCol = sort, sortOrder = order) {
    const { deployTokens, totalCount: count } = await getDeployTokens(applicationId, {
      page: targetPage, limit: LIMIT, sort: sortCol, order: sortOrder
    })
    setTokens(deployTokens)
    setTotalCount(count)
  }

  useEffect(() => {
    if (applicationId) loadTokens(0, sort, order)
  }, [applicationId])

  function changePage (targetPage) {
    setPage(targetPage)
    loadTokens(targetPage, sort, order)
  }

  function sortBy (column) {
    const nextOrder = sort === column && order === 'asc' ? 'desc' : 'asc'
    setSort(column)
    setOrder(nextOrder)
    setPage(0)
    loadTokens(0, column, nextOrder)
  }

  async function create () {
    if (!name.trim()) {
      setNotice({ type: 'error', text: 'A token label is required.' })
      return
    }
    setBusy(true)
    try {
      const expiresAt = expiryDays
        ? new Date(Date.now() + Number(expiryDays) * DAY_MS).toISOString()
        : null
      const { token, deployToken } = await createDeployToken(applicationId, { name: name.trim(), expiresAt })
      setRevealed({ name: deployToken.name, token })
      setName('')
      setExpiryDays('')
      setNotice(null)
      await loadTokens()
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function revoke (token) {
    setBusy(true)
    try {
      await revokeDeployToken(applicationId, token.id)
      setNotice({ type: 'success', text: `Token "${token.name}" revoked` })
      await loadTokens()
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  function copyToken () {
    if (revealed?.token) copyToClipboard(revealed.token)
  }

  return (
    <div>
      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN}>
        <div className={commonStyles.smallFlexBlock}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <Icons.KeyIcon color={WHITE} size={MEDIUM} />
            <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Deploy Tokens</p>
          </div>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>
            App-bound tokens for CI to call the deploy API. A token is shown once at creation and its label cannot be changed. It can deploy new versions and read version status, nothing else.
          </p>

          {notice && (
            <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess} ${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{notice.text}</p>
              <Button
                textClass={typographyStyles.desktopButtonSmall}
                paddingClass={commonStyles.smallButtonPadding}
                label='Dismiss'
                onClick={() => setNotice(null)}
                color={WHITE}
                backgroundColor={TRANSPARENT}
                bordered
              />
            </div>
          )}

          {revealed && (
            <div className={`${styles.reveal} ${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>Copy this token now. It will not be shown again.</p>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
                <span className={`${typographyStyles.terminal} ${styles.tokenValue}`}>{revealed.token}</span>
                <div className={commonStyles.tinyFlexRow}>
                  <Button
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    label='Copy'
                    onClick={copyToken}
                    color={RICH_BLACK}
                    backgroundColor={WHITE}
                  />
                  <Button
                    textClass={typographyStyles.desktopButtonSmall}
                    paddingClass={commonStyles.smallButtonPadding}
                    label='Done'
                    onClick={() => setRevealed(null)}
                    color={WHITE}
                    backgroundColor={TRANSPARENT}
                    bordered
                  />
                </div>
              </div>
            </div>
          )}

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <Forms.Input
              name='deployTokenName'
              placeholder='Token label'
              value={name}
              onChange={(event) => setName(event.target.value)}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
            />
            <Forms.Select
              options={EXPIRY_OPTIONS}
              value={EXPIRY_OPTIONS.find((option) => option.value === expiryDays)?.label ?? 'Never'}
              onSelect={(event) => setExpiryDays(event.detail.value)}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
              mainColor={WHITE}
              borderListColor={WHITE}
              optionsBorderedBottom={false}
              defaultContainerClassName={styles.expirySelect}
              defaultOptionsClassName={typographyStyles.desktopButtonSmall}
            />
            <Button
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
              label='New token'
              onClick={create}
              disabled={busy}
              color={RICH_BLACK}
              backgroundColor={WHITE}
            />
          </div>

          {totalCount > 0 && (
            <>
              <table>
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} className={styles.sortable} onClick={() => sortBy(column.key)}>
                        {column.label}
                        {sort === column.key && (
                          <span className={`${styles.caret} ${order === 'asc' ? styles.caretAsc : styles.caretDesc}`} />
                        )}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => {
                    const state = tokenState(token)
                    return (
                      <tr key={token.id}>
                        <td>{token.name}</td>
                        <td>{getFormattedTimeAndDate(token.createdAt)}</td>
                        <td>{token.expiresAt ? getFormattedTimeAndDate(token.expiresAt) : 'Never'}</td>
                        <td>{token.lastUsedAt ? getFormattedTimeAndDate(token.lastUsedAt) : 'Never used'}</td>
                        <td><StatusPill status={state} backgroundColor={STATE_COLORS[state] ?? WARNING_YELLOW} /></td>
                        <td>
                          {state === 'active' && (
                            <Button
                              textClass={typographyStyles.desktopButtonSmall}
                              paddingClass={commonStyles.smallButtonPadding}
                              label='Revoke'
                              onClick={() => revoke(token)}
                              disabled={busy}
                              color={WHITE}
                              backgroundColor={ERROR_RED}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <Paginator
                pagesNumber={Math.max(1, Math.ceil(totalCount / LIMIT))}
                onClickPage={changePage}
                selectedPage={page}
              />
            </>
          )}
        </div>
      </BorderedBox>
    </div>
  )
}
