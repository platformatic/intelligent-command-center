import React, { useEffect, useState } from 'react'
import useICCStore from '~/useICCStore'
import { Forms, Modal, Button, HorizontalSeparator, BorderedBox } from '@platformatic/ui-components'
import styles from './Profile.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { WHITE, MARGIN_0, RICH_BLACK, OPACITY_15, MODAL_POPUP_V2, TRANSPARENT, ERROR_RED, OPACITY_10 } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import { getGithubUserInfo } from '~/api'

export default function Account () {
  const { user } = useICCStore()
  const [showModalDeleteUser, setShowModalDeleteUser] = useState(false)
  const [form] = useState({ name: user?.username ?? '', email: user?.email ?? '' })
  const [gravatarUrl, setGravatarUrl] = useState('./githubUser.png')

  useEffect(() => {
    if (user?.email) {
      async function getAvatarUrl () {
        try {
          const data = await getGithubUserInfo(user.email)
          const data1 = await data.json()
          if ((data1.items?.length ?? 0) > 0 && data1.items[0]?.avatar_url) {
            setGravatarUrl(`${data1.items[0]?.avatar_url}&s=140`)
          }
        } catch (error) {
          console.error(`Error getting image gravatar: ${error}`)
        }
      }
      getAvatarUrl()
    }
  }, [user])

  async function handleSubmit (event) {
    event.preventDefault()
  }

  return (
    <>

      <form onSubmit={handleSubmit} className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
        <Forms.Field
          title='Profile picture'
          helper='Your profile picture will be visible you and your team.'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
          helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
        >
          <img className={`${styles.userPicture} ${styles.userPictureLarge}`} src={gravatarUrl} height={140} width={140} />
        </Forms.Field>
        <HorizontalSeparator color={WHITE} opacity={OPACITY_15} marginTop={MARGIN_0} marginBottom={MARGIN_0} />

        <Forms.Field
          title='Username'
          helper='Your name will be visible to you and your team.'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
          helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
        >
          <Forms.Input
            name='name'
            borderColor={WHITE}
            backgroundColor={RICH_BLACK}
            value={form.name}
            disabled
          />
        </Forms.Field>
        <HorizontalSeparator color={WHITE} opacity={OPACITY_15} marginTop={MARGIN_0} marginBottom={MARGIN_0} />
        <Forms.Field
          title='Public email'
          helper='Your public email will be visible to you and your team.'
          titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
          helperClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}
        >
          <Forms.Input
            type='email'
            name='email'
            borderColor={WHITE}
            backgroundColor={RICH_BLACK}
            value={form.email}
            disabled
          />
        </Forms.Field>
        <HorizontalSeparator color={WHITE} opacity={OPACITY_15} marginTop={MARGIN_0} marginBottom={MARGIN_0} />
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <p
            className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textErrorRed}`}
            title='Danger Zone'
          >
            Danger Zone
          </p>
          <BorderedBox backgroundColor={ERROR_RED} backgroundColorOpacity={OPACITY_10} color={TRANSPARENT} classes={`${commonStyles.mediumFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween} `}>
            <div className={`${commonStyles.tinyFlexBlock}`}>
              <span className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textErrorRed}`}>Delete User</span>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70} `}>Once you delete your account, there is no going back.</span>
            </div>
            <Button
              label='Delete User'
              color={ERROR_RED}
              type='button'
              onClick={() => setShowModalDeleteUser(true)}
              textClass={typographyStyles.desktopButtonSmall}
              paddingClass={commonStyles.smallButtonPadding}
            />
          </BorderedBox>
        </div>

      </form>
      {showModalDeleteUser && (
        <Modal
          title='Delete User'
          setIsOpen={setShowModalDeleteUser}
          layout={MODAL_POPUP_V2}
          titleClassName={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}
        >
          <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.opacity70} ${commonStyles.fullWidth}`}>
            To delete your user, please contact us at:<br /><a href='mailto:support@platformatic.dev?subject=I want in!' className={typographyStyles.textTertiaryBlue}>support@platformatic.dev</a>.
          </p>
        </Modal>
      )}
    </>
  )
}
