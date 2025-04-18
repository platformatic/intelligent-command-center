import React, { useEffect, useState } from 'react'
import Account from './Account'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './Profile.module.css'
import { HorizontalSeparator, LoadingSpinnerV2 } from '@platformatic/ui-components'
import useICCStore from '~/useICCStore'
import { MARGIN_0, WHITE, OPACITY_15 } from '@platformatic/ui-components/src/components/constants'
import { KEY_PROFILE } from '~/ui-constants'
import ErrorComponent from '~/components/errors/ErrorComponent'
import AccountMenu from '~/components/profile/lateralMenu/AccountMenu'
import { getGithubUserInfo } from '~/api'

function Profile () {
  const sectionSelected = KEY_PROFILE
  const globalState = useICCStore()
  const { user } = globalState
  const [sections, setSections] = useState([])
  const [components, setComponents] = useState([])
  const [currentComponent, setCurrentComponent] = useState(null)
  const [showErrorComponent, setShowErrorComponent] = useState(false)
  const [innerLoading] = useState(false)
  const [gravatarUrl, setGravatarUrl] = useState('./githubUser.png')

  useEffect(() => {
    if (user?.email) {
      async function getAvatarUrl () {
        try {
          const data = await getGithubUserInfo(user.email)
          const data1 = await data.json()
          if ((data1.items?.length ?? 0) > 0 && data1.items[0]?.avatar_url) {
            setGravatarUrl(`${data1.items[0]?.avatar_url}&s=48`)
          }
        } catch (error) {
          console.error(`Error getting image gravatar: ${error}`)
        }
      }
      getAvatarUrl()
    }
  }, [user])

  useEffect(() => {
    setComponents([])
    setSections([])

    const tmpSections = [{
      title: 'Profile overview',
      key: KEY_PROFILE,
      icon: 'UserIcon'
    }]
    const tmsComponents = [<Account key={KEY_PROFILE} onErrorOccurred={() => setShowErrorComponent(true)} />]

    setComponents([...tmsComponents])
    setSections([...tmpSections])
    if (sectionSelected) {
      setCurrentComponent(tmsComponents.find(component => component.key === sectionSelected))
    }
  }, [])

  function evaluateSectionSelected (key) {
    if (sectionSelected === key) {
      setCurrentComponent(components.find(component => component.key === key))
    }
  }

  function renderLateralBar () {
    // prevent to render something if the subsections are not ready
    if (sections.length === 0) {
      return (<></>)
    }

    return (
      <>
        <div className={`${commonStyles.mediumFlexRow}`}>
          <img className={`${styles.userPicture} ${styles.userPictureSmall}`} src={gravatarUrl} />
          <div className={`${commonStyles.tinyFlexBlock}`}>
            <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>{user?.username}</p>
            <p className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>{user?.email || '-'}</p>
          </div>
        </div>
        <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} opacity={OPACITY_15} color={WHITE} />
      </>
    )
  }

  function renderContent () {
    if (innerLoading) {
      return (
        <LoadingSpinnerV2
          loading={innerLoading}
          applySentences={{
            containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
            sentences: [{
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
              text: 'Loading your organizations...'
            }, {
              style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
              text: 'This process will just take a few seconds.'
            }]
          }}
          containerClassName={styles.loadingSpinner}
          spinnerProps={{ size: 40, thickness: 3 }}
        />
      )
    }

    if (showErrorComponent) {
      return <ErrorComponent />
    }

    return (
      <div className={styles.content}>
        <div className={`${styles.left} ${commonStyles.smallFlexBlock} `}>
          {renderLateralBar()}
          <AccountMenu onClickAccount={(key) => evaluateSectionSelected(key)} />
        </div>
        <div className={styles.right}>
          {currentComponent}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {renderContent()}
    </div>
  )
}

export default Profile
