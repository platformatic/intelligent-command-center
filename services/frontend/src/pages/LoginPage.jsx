import React, { useState } from 'react'
import styles from './LoginPage.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import { Button, Forms, LoadingSpinnerV2 } from '@platformatic/ui-components'
import { RICH_BLACK, WHITE } from '@platformatic/ui-components/src/components/constants'
import Logo from '~/components/ui/Logo'

function LoginControls ({ provider, loginHandler }) {
  const [sitePassword, setSitePassword] = useState()
  const [incorrectPasswordMessage, setIncorrectPasswordMessage] = useState('')

  const loginButtons = {
    google: (
      <Button
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        onClick={() => loginHandler('google')}
        label='Login with Google'
        bordered={false}
        color={RICH_BLACK}
        backgroundColor={WHITE}
        platformaticIcon={{ iconName: 'OtherLogosGoogleIcon', color: WHITE }}
      />
    ),
    github: (
      <Button
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        onClick={() => loginHandler('github')}
        label='Login with GitHub'
        bordered={false}
        color={RICH_BLACK}
        backgroundColor={WHITE}
        platformaticIcon={{ iconName: 'SocialGitHubIcon', color: RICH_BLACK }}
      />
    ),
    password: (
      <>
        <Forms.Input
          name='sitePassword'
          placeholder='Enter password...'
          borderColor={WHITE}
          backgroundColor={RICH_BLACK}
          inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
          value={sitePassword}
          onChange={(ev) => setSitePassword(ev.target.value)}
          errorMessage={incorrectPasswordMessage}
        />
        <Button
          textClass={typographyStyles.desktopButtonSmall}
          paddingClass={commonStyles.smallButtonPadding}
          onClick={() => {
            fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/demo`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: sitePassword })
            }).then(response => {
              if (response.ok) return response.json()
              return Promise.reject(new Error('Unable to validate password'))
            }).then(({ success }) => {
              if (success) window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/login/demo`
              else setIncorrectPasswordMessage('Incorrect password')
            }).catch(err => {
              setIncorrectPasswordMessage(err.message)
            })
          }}
          label='Login'
          bordered={false}
          color={RICH_BLACK}
          backgroundColor={WHITE}
        />
      </>
    ),
    demo: (
      <Button
        textClass={typographyStyles.desktopButtonSmall}
        paddingClass={commonStyles.smallButtonPadding}
        onClick={() => { window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/login/demo` }}
        label='Demo Login'
        bordered={false}
        color={RICH_BLACK}
        backgroundColor={WHITE}
      />
    )
  }
  return loginButtons[provider]
}

function LoginPage () {
  const [innerLoading, setInnerLoading] = useState(false)
  const supportedLogins = (import.meta.env.VITE_SUPPORTED_LOGINS ?? '')
    .split(',')
    .filter(login => !!login && login !== '')

  function handleLoginButton (provider) {
    setInnerLoading(true)
    window.location.href = `${import.meta.env.VITE_SERVER_URL}/api/login/${provider}`
  }

  if (innerLoading) {
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
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={`${commonStyles.largeFlexBlock} ${styles.leftContainer}`}>
          <div className={commonStyles.mediumFlexBlock}>
            <Logo width={80} height={54.37} />

            <div className={commonStyles.tinyFlexBlock}>
              <div className={commonStyles.flexBlockNoGap}>
                <h2 className={`${typographyStyles.desktopHeadline2} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                  Welcome to the
                </h2>
                <h2 className={`${typographyStyles.desktopHeadline2} ${typographyStyles.textWhite}`}>
                  Intelligent Command Center
                </h2>
              </div>

              <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>
                The single point of truth and observability for managing your Node.js applications.
              </p>
            </div>
            <div className={`${commonStyles.smallFlexRow}`}>
              {supportedLogins.map((provider, idx) =>
                <LoginControls key={idx} provider={provider} loginHandler={handleLoginButton} />
              )}
              {supportedLogins.length === 0 &&
                <p className={`${typographyStyles.desktopBody} ${typographyStyles.textErrorRed} ${typographyStyles.opacity70}`}>
                  No login providers configured via <code>VITE_SUPPORTED_LOGINS</code>.
                </p>}
            </div>
          </div>

        </div>
        <div className={styles.rightContainer}>
          <img alt='hero-image' loading='lazy' width='500' height='500' decoding='async' className={styles.imgHero} src='/backgrounds/home_page_background.svg' style={{ color: 'transparent' }} />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
