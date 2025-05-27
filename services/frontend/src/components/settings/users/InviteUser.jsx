import React, { useState } from 'react'
import { MARGIN_0, OPACITY_30, TRANSPARENT, WHITE, DULLS_BACKGROUND_COLOR, RICH_BLACK, SMALL } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, HorizontalSeparator } from '@platformatic/ui-components'
import Forms from '@platformatic/ui-components/src/components/forms'
import { EMAIL_PATTERN } from '~/ui-constants'

function InviteUser ({
  onClickCancel = () => {},
  onClickConfirm = () => {}
}) {
  const [validForm, setValidForm] = useState(false)
  const [inviteSending, setInviteSending] = useState(false)
  const [form, setForm] = useState({ inviteEmail: '' })
  const [emails, setEmails] = useState([])
  const [validations, setValidations] = useState({ inviteEmail: false, formErrors: { inviteEmail: '' } })
  const [emailPlaceHolder, setEmailPlaceHolder] = useState('example@gmail.com')

  async function handleSubmit (event) {
    event.preventDefault()
    onClickConfirm([form.inviteEmail, ...emails].filter(email => email !== ''))
    setInviteSending(true)
  }

  async function onClickAddUser () {
    onClickConfirm([form.inviteEmail, ...emails].filter(email => email !== ''))
    setInviteSending(true)
  }

  function validateForm (validations, callback = () => {}) {
    setValidForm(validations.inviteEmail)
    return callback
  }

  function validateField (fieldName, fieldValue, callback = () => {}) {
    let inviteEmail = validations.inviteEmail
    const formErrors = { ...validations.formErrors }
    switch (fieldName) {
      case 'inviteEmail':
        inviteEmail = fieldValue.length > 0 && EMAIL_PATTERN.test(fieldValue)
        formErrors.inviteEmail = fieldValue.length > 0 ? (inviteEmail ? '' : 'The field is not valid, make sure you are typed a correct email address') : ''
        break
      default:
        break
    }
    const nextValidation = { ...validations, inviteEmail, formErrors }
    setValidations(nextValidation)
    validateForm(nextValidation, callback())
  }

  function handleChangeEmail ({ value, chunks }) {
    setEmails(() => [...chunks])
    setEmailPlaceHolder(() => chunks.length > 0 ? '' : 'example@gmail.com')
    validateField('inviteEmail', value, setForm(form => ({ ...form, inviteEmail: value })))
  }

  return (
    <div className={`${commonStyles.mediumFlexBlock} ${commonStyles.fullWidth}`}>
      <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${commonStyles.fullWidth}`}>
        <span className={`${typographyStyles.opacity70}`}>You can add one or multiple users by adding their emails in the field below.<br />Use a comma as separator.</span>
      </p>
      <form onSubmit={handleSubmit} className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} `}>

          <Forms.Field
            title='Email'
            titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite} `}
          >
            <Forms.InputWithSeparator
              placeholder={emailPlaceHolder}
              name='inviteEmail'
              borderColor={WHITE}
              value={form.inviteEmail}
              onChange={handleChangeEmail}
              errorMessage={validations.formErrors.inviteEmail}
              errorMessageTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textErrorRed}`}
              textClass={typographyStyles.desktopBodySmall}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              backgroundColor={RICH_BLACK}
              separators={[',']}
              beforeIcon={{
                iconName: 'MailIcon',
                color: WHITE,
                size: SMALL
              }}
            />
          </Forms.Field>
        </div>
        <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_30} />

        <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
          <Button
            type='button'
            label='Cancel'
            onClick={() => onClickCancel()}
            color={WHITE}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
          />
          <Button
            type='button'
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
            label={inviteSending ? `Adding user${emails.length > 1 ? 's' : ''}...` : `Add user${emails.length > 1 ? 's' : ''}`}
            onClick={() => onClickAddUser()}
            color={RICH_BLACK}
            backgroundColor={WHITE}
            hoverEffect={DULLS_BACKGROUND_COLOR}
            disabled={form.inviteEmail !== '' ? !validForm : emails.length === 0}
            bordered={false}
          />
        </div>
      </form>
    </div>
  )
}

export default InviteUser
