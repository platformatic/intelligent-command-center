import React, { useEffect, useState } from 'react'
import { useRouteLoaderData } from 'react-router-dom'
import styles from './VersionManager.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Button } from '@platformatic/ui-components'
import {
  MEDIUM, SMALL, WHITE, RICH_BLACK, TRANSPARENT, ERROR_RED,
  MAIN_GREEN, WARNING_YELLOW, TERTIARY_BLUE
} from '@platformatic/ui-components/src/components/constants'
import StatusPill from '~/components/common/StatusPill'
import NoDataFound from '~/components/ui/NoDataFound'
import PlanView from './PlanView'
import Paginator from '~/components/ui/Paginator'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import {
  getApplicationVersionsPage,
  getApplicationVersionsRPS,
  getApplicationVersionAudit,
  getSkewProtectionPolicy,
  getVersionActuationPlan,
  approveApplicationVersion,
  rejectApplicationVersion,
  promoteApplicationVersion,
  expireApplicationVersion
} from '~/api'

const LIMIT = 10
const REFRESH_INTERVAL_MS = 5000

const STATUS_COLORS = {
  active: MAIN_GREEN,
  staged: WARNING_YELLOW,
  'pending-apply': WARNING_YELLOW,
  draining: TERTIARY_BLUE,
  'pending-expire': WARNING_YELLOW,
  expired: ERROR_RED
}

const ACTION_LABELS = { approve: 'Approve', reject: 'Reject', promote: 'Set Active', expire: 'Expire' }
const ACTION_DONE = { approve: 'approved', reject: 'rejected', promote: 'set as active', expire: 'expired' }

// "manage" -> "Manage Mode"; shown next to the title so the operator knows
// whether the actions actuate (manage) or only surface a plan (advise).
function modeTitle (mode) {
  if (!mode) return null
  return `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Mode`
}

// Lifecycle actions available per state. approve/reject gate a staged version;
// set-active/expire act on a draining one. active and pending-apply have no action.
// These are manage-mode actions: ICC actuates them.
function actionsFor (status) {
  if (status === 'staged') return ['approve', 'reject']
  if (status === 'draining') return ['promote', 'expire']
  return []
}

// Versions with a read-only plan to view in advise mode: pending-apply/staged
// show the activate plan, pending-expire shows the teardown plan. draining shows
// no plan yet -- the customer clicks Expire first, which moves it to
// pending-expire and produces the teardown plan.
function hasActuationPlan (status) {
  return status === 'pending-apply' || status === 'staged' || status === 'pending-expire'
}

// Versions the customer can choose to expire in advise mode. Clicking Expire
// moves them to pending-expire (or straight to expired when nothing routes to
// them). The active version is not directly expirable -- expiring the sole
// serving version would leave the gateway with no default backend; it is retired
// by being superseded (-> draining) first.
function isExpirable (status) {
  return status === 'draining' || status === 'pending-apply'
}

function isDestructive (action) {
  return action === 'reject' || action === 'expire'
}

function formatRps (value) {
  return Math.round(value * 10) / 10
}

export default function VersionManager () {
  const { application } = useRouteLoaderData('appRoot')
  const [versions, setVersions] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [audit, setAudit] = useState([])
  const [notice, setNotice] = useState(null)
  const [plan, setPlan] = useState(null)
  const [rpsByVersion, setRpsByVersion] = useState({})
  const [mode, setMode] = useState(null)

  async function loadVersions (targetPage) {
    if (!application?.id) return
    const [{ versions: list, totalCount: count }, rps] = await Promise.all([
      getApplicationVersionsPage(application.id, { page: targetPage, limit: LIMIT }),
      getApplicationVersionsRPS(application.id)
    ])
    setVersions(list)
    setTotalCount(count)
    setRpsByVersion(rps)
  }

  function changePage (targetPage) {
    setPage(targetPage)
    setExpanded(null)
    setAudit([])
    loadVersions(targetPage)
  }

  useEffect(() => {
    setPage(0)
    setExpanded(null)
    setAudit([])
    loadVersions(0)
    // Mode decides whether lifecycle actions actuate (manage) or are surfaced as
    // read-only plans to apply (advise). Policy endpoint returns { overrides, resolved }.
    if (application?.id) {
      getSkewProtectionPolicy(application.id).then((p) => setMode(p?.resolved?.mode ?? p?.mode ?? null))
    }
  }, [application?.id])

  // Auto-refresh so a new deploy (a freshly registered version) shows up without
  // a manual reload.
  useEffect(() => {
    if (!application?.id) return
    const interval = setInterval(() => loadVersions(page), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [application?.id, page])

  async function openAudit (versionLabel) {
    const entries = await getApplicationVersionAudit(application.id, versionLabel)
    setAudit(entries)
    setExpanded(versionLabel)
  }

  function toggleAudit (versionLabel) {
    if (expanded === versionLabel) {
      setExpanded(null)
      setAudit([])
    } else {
      openAudit(versionLabel)
    }
  }

  // Advise mode: fetch the read-only plan (command + manifest) for this version
  // and render it. ICC actuates nothing; the customer applies the plan.
  async function showPlan (versionLabel) {
    setBusy(`plan:${versionLabel}`)
    try {
      const result = await getVersionActuationPlan(application.id, versionLabel)
      setPlan({ versionLabel, action: result.intent, steps: result.steps ?? [] })
      setNotice({ type: 'info', text: `Advise mode: apply the plan below to ${result.intent} ${versionLabel}` })
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    } finally {
      setBusy(null)
    }
  }

  async function runAction (action, versionLabel) {
    setBusy(`${action}:${versionLabel}`)
    try {
      let result
      if (action === 'approve') result = await approveApplicationVersion(application.id, versionLabel)
      else if (action === 'reject') result = await rejectApplicationVersion(application.id, versionLabel)
      else if (action === 'promote') result = await promoteApplicationVersion(application.id, versionLabel)
      else if (action === 'expire') result = await expireApplicationVersion(application.id, versionLabel)

      // Advise mode never auto-opens the plan. The action lands the version in
      // pending-apply / pending-expire, and that row carries a Show Plan action
      // the customer uses when ready -- so here we only reflect the state change.
      // A version that resolved immediately (e.g. expiring a pending-apply nothing
      // routes to) is just confirmed done.
      const awaitingApply = result?.pendingApply || result?.pendingExpire
      setPlan(null)
      if (awaitingApply) {
        const pendingStatus = result.pendingExpire ? 'pending-expire' : 'pending-apply'
        setNotice({ type: 'info', text: `${versionLabel} is ${pendingStatus} — use Show Plan to view the commands to apply.` })
      } else {
        setNotice({ type: 'success', text: `Version ${versionLabel} ${ACTION_DONE[action]}` })
      }
      await loadVersions(page)
      if (expanded === versionLabel) await openAudit(versionLabel)
    } catch (err) {
      setNotice({ type: 'error', text: err.message })
    } finally {
      setBusy(null)
    }
  }

  // Advise mode: the fetched plan takes over the card as a read-only "Advised
  // Plan" view. ICC actuates nothing; the customer applies the commands below.
  if (plan) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
              <Icons.DeploymentHistoryIcon color={WHITE} size={MEDIUM} />
              <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Advised Plan</p>
            </div>
            <span className={styles.closeButton} onClick={() => { setPlan(null); setNotice(null) }}>
              <Icons.CloseIcon color={WHITE} size={SMALL} />
            </span>
          </div>

          <div className={`${styles.notice} ${styles.noticeInfo} ${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Advise mode: apply the plan below to {plan.action} {plan.versionLabel}</p>
          </div>

          <PlanView steps={plan.steps} action={plan.action} versionLabel={plan.versionLabel} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter}`}>
          <Icons.DeploymentHistoryIcon color={WHITE} size={MEDIUM} />
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Version Manager</p>
          {modeTitle(mode) && (
            <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>{modeTitle(mode)}</p>
          )}
        </div>

        {notice && (
          <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : notice.type === 'info' ? styles.noticeInfo : styles.noticeSuccess} ${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween}`}>
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

        {totalCount === 0 && (
          <NoDataFound title='No versions yet' subTitle={<span>There’s no version history for this application.</span>} />
        )}

        {versions.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Traffic</th>
                  <th>Created on (GMT)</th>
                  <th>Expire policy</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <React.Fragment key={version.id}>
                    <tr>
                      <td>{version.versionLabel || '-'}</td>
                      <td><StatusPill status={version.status} backgroundColor={STATUS_COLORS[version.status] ?? TERTIARY_BLUE} /></td>
                      <td>
                        {rpsByVersion[version.versionLabel] !== undefined
                          ? (<span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>{formatRps(rpsByVersion[version.versionLabel])} rps</span>)
                          : (<span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>-</span>)}
                      </td>
                      <td>{getFormattedTimeAndDate(version.createdAt)}</td>
                      <td>{version.expirePolicy || '-'}</td>
                      <td>
                        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
                          <Button
                            textClass={typographyStyles.desktopButtonSmall}
                            paddingClass={commonStyles.smallButtonPadding}
                            label={expanded === version.versionLabel ? 'Hide Audit' : 'View Audit'}
                            platformaticIconAfter={{ iconName: expanded === version.versionLabel ? 'ArrowUpIcon' : 'ArrowDownIcon', color: WHITE, size: SMALL }}
                            onClick={() => toggleAudit(version.versionLabel)}
                            selected={expanded === version.versionLabel}
                            color={WHITE}
                            backgroundColor={TRANSPARENT}
                            bordered
                          />
                          {mode === 'advise'
                            ? (
                              <>
                                {hasActuationPlan(version.status) && (
                                  <Button
                                    textClass={typographyStyles.desktopButtonSmall}
                                    paddingClass={commonStyles.smallButtonPadding}
                                    label='Show Plan'
                                    platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: RICH_BLACK, size: SMALL }}
                                    onClick={() => showPlan(version.versionLabel)}
                                    disabled={busy === `plan:${version.versionLabel}`}
                                    color={RICH_BLACK}
                                    backgroundColor={WHITE}
                                  />
                                )}
                                {isExpirable(version.status) && (
                                  <Button
                                    textClass={typographyStyles.desktopButtonSmall}
                                    paddingClass={commonStyles.smallButtonPadding}
                                    label='Expire'
                                    onClick={() => runAction('expire', version.versionLabel)}
                                    disabled={busy === `expire:${version.versionLabel}`}
                                    color={ERROR_RED}
                                    backgroundColor={TRANSPARENT}
                                    bordered
                                  />
                                )}
                              </>
                              )
                            : actionsFor(version.status).map((action) => (
                              <Button
                                key={action}
                                textClass={typographyStyles.desktopButtonSmall}
                                paddingClass={commonStyles.smallButtonPadding}
                                label={ACTION_LABELS[action]}
                                onClick={() => runAction(action, version.versionLabel)}
                                disabled={busy === `${action}:${version.versionLabel}`}
                                color={isDestructive(action) ? ERROR_RED : RICH_BLACK}
                                backgroundColor={isDestructive(action) ? TRANSPARENT : WHITE}
                                bordered
                              />
                            ))}
                        </div>
                      </td>
                    </tr>
                    {expanded === version.versionLabel && (
                      <tr>
                        <td colSpan={6}>
                          <div className={styles.audit}>
                            {audit.length === 0 && (
                              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>No audit entries.</p>
                            )}
                            {audit.map((entry, index) => (
                              <div key={index} className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${styles.auditRow}`}>
                                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(entry.createdAt)}</span>
                                <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{entry.event}</span>
                                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>
                                  {entry.fromState ? `${entry.fromState} -> ${entry.toState}` : entry.toState}
                                </span>
                                <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.opacity70} ${typographyStyles.textWhite}`}>
                                  by {entry.actorType}{entry.actorName ? `:${entry.actorName}` : ''}{entry.reason ? ` (${entry.reason})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
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
    </div>
  )
}
