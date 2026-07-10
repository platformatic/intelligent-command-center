import React, { useState } from 'react'
import { Button, Modal, Forms, PlatformaticIcon } from '@platformatic/ui-components'
import { MODAL_POPUP_V2, MEDIUM, RICH_BLACK, WHITE, SMALL } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { createApplication } from '~/api'
import styles from './CreateWattModal.module.css'

// The token-scoped deploy endpoint (the app is resolved from the token, so no
// application id in the path). Absolute so it is copy-pasteable from the modal.
const DEPLOY_URL = `${import.meta.env.VITE_API_BASE_URL || window.location.origin}/control-plane/deploy`

// Step 2 guidance for a freshly created, not-yet-deployed Watt. The deploy token
// shown alongside is the one credential these steps need.
const DEPLOY_STEPS = [
  { title: 'Add the token as a CI secret', description: 'Store this token as PLT_DEPLOY_TOKEN in your CI/CD provider. It is shown only once.' },
  { title: 'Build and push your image', description: 'Build your Watt image and push it to your registry as part of your pipeline.' },
  {
    title: 'Deploy to ICC',
    description: 'POST your image to the deploy API. The token authorizes the call and identifies your Watt. For a private image, include registry credentials in pullSecret and ICC pulls it for you -- no cluster access needed.',
    code: `curl -X POST ${DEPLOY_URL} \\\n  -H "Authorization: Bearer $PLT_DEPLOY_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "image": "<your-image:tag>",\n    "pullSecret": {\n      "registry": "<registry>",\n      "username": "<username>",\n      "password": "<password>"\n    }\n  }'`
  },
  { title: 'Watch it go live', description: 'Once the deployment is ready, your Watt appears here with its metrics and services.' }
]

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

export default function CreateWattModal ({ setIsOpen = () => {}, onCreated = () => {} }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleContinue () {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('A Watt name is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const created = await createApplication(trimmed)
      setResult(created)
      setStep(2)
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function copyToken () {
    if (result?.token) {
      copyToClipboard(result.token)
      setCopied(true)
    }
  }

  const title = (
    <div className={commonStyles.tinyFlexBlock}>
      <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Step {step} of 2</span>
      <span className={`${typographyStyles.desktopHeadline4} ${typographyStyles.textWhite}`}>{step === 1 ? 'Create a new Watt' : 'Deploy your Watt'}</span>
    </div>
  )

  function renderStep1 () {
    return (
      <div className={styles.stepBody}>
        <div className={commonStyles.tinyFlexBlock}>
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Watt Name</p>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Give your Watt a name to get started.</p>
        </div>
        <Forms.Input
          name='wattName'
          placeholder='my-watt-example'
          value={name}
          onChange={(event) => { setName(event.target.value); setError(null) }}
          backgroundColor={RICH_BLACK}
          borderColor={WHITE}
        />
        {error && <p className={`${typographyStyles.desktopBodySmall} ${styles.error}`}>{error}</p>}
        <div className={styles.actions}>
          <Button
            label='Continue'
            onClick={handleContinue}
            disabled={busy}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
          />
        </div>
      </div>
    )
  }

  function renderStep2 () {
    return (
      <div className={styles.stepBody}>
        <div className={commonStyles.tinyFlexBlock}>
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Deployment Token</p>
          <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Copy this token now. For security it will not be shown again.</p>
          <div className={`${styles.tokenRow} ${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.terminal} ${styles.tokenValue}`}>{result?.token}</span>
            <PlatformaticIcon iconName='CopyPasteIcon' color={WHITE} size={SMALL} onClick={copyToken} internalOverHandling />
          </div>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Name: {result?.deployToken?.name}</span>
            <span className={`${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Expires: Never</span>
            {copied && <span className={`${typographyStyles.desktopBodySmallest} ${styles.copied}`}>Copied</span>}
          </div>
        </div>

        <div className={commonStyles.tinyFlexBlock}>
          <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Deployment Steps</p>
          <div className={styles.steps}>
            {DEPLOY_STEPS.map((deployStep, index) => (
              <div key={index} className={styles.step}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
                  <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{deployStep.title}</p>
                  <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{deployStep.description}</p>
                  {deployStep.code && (
                    <div className={`${styles.codeBlock} ${commonStyles.tinyFlexRow} ${commonStyles.justifyBetween} ${commonStyles.fullWidth}`}>
                      <pre className={`${typographyStyles.terminal} ${styles.code}`}>{deployStep.code}</pre>
                      <PlatformaticIcon iconName='CopyPasteIcon' color={WHITE} size={SMALL} onClick={() => copyToClipboard(deployStep.code)} internalOverHandling />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            label='Done'
            onClick={() => setIsOpen(false)}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
          />
        </div>
      </div>
    )
  }

  return (
    <Modal
      layout={MODAL_POPUP_V2}
      size={MEDIUM}
      setIsOpen={setIsOpen}
      title={title}
      titleClassName={styles.titleContainer}
      additionalModalClassName={styles.modal}
    >
      {step === 1 ? renderStep1() : renderStep2()}
    </Modal>
  )
}
