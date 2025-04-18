import React, { useEffect, useState } from 'react'
import styles from './HeadersForm.module.css'
import { ButtonOnlyIcon, Forms } from '@platformatic/ui-components'
import { RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'

function HeaderRow ({ name, value, onAdd = () => {}, onRemove = () => {} }) {
  const [currentValue, setCurrentValue] = useState({ name, value })
  function handleChange (event, field) {
    setCurrentValue({ ...currentValue, [field]: event.target.value })
  }
  function resetForm () {
    setCurrentValue({ name: '', value: '' })
  }

  function shouldEnableAddButton () {
    return currentValue.name.length !== 0 && currentValue.value.length !== 0
  }
  return (
    <div className={`${styles.row}`}>
      <Forms.Input
        name='name'
        value={currentValue.name}
        onChange={(ev) => handleChange(ev, 'name')}
        placeholder='Enter header name'
        borderColor={WHITE}
        backgroundColor={RICH_BLACK}
        inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
      />

      <Forms.Input
        name='value'
        value={currentValue.value}
        onChange={(ev) => handleChange(ev, 'value')}
        placeholder='Enter header value'
        borderColor={WHITE}
        backgroundColor={RICH_BLACK}
        inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
      />
      {name && value && (

        <ButtonOnlyIcon
          type='button'
          onClick={() => {
            onRemove(currentValue.name)
          }}
          disabled={!shouldEnableAddButton()}
          color={WHITE}
          backgroundColor={RICH_BLACK}
          paddingClass={commonStyles.smallButtonPadding}
          platformaticIcon={{ iconName: 'TrashIcon', color: WHITE, size: SMALL }}
        />
      )}

      {!name && !value && (
        <ButtonOnlyIcon
          onClick={() => {
            onAdd(currentValue.name, currentValue.value)
            resetForm()
          }}
          color={WHITE}
          backgroundColor={RICH_BLACK}
          paddingClass={commonStyles.smallButtonPadding}
          platformaticIcon={{ iconName: 'AddIcon', color: WHITE, size: SMALL }}
        />
      )}
    </div>
  )
}

export default function HeadersForm ({ headers, onChange = (newHeaders) => {} }) {
  const [currentHeaders, setCurrentHeaders] = useState({})

  useEffect(() => {
    setCurrentHeaders(headers)
  }, [])

  useEffect(() => {
    onChange(currentHeaders)
  }, [currentHeaders])

  function handleAddHeader (name, value) {
    if (name.length !== 0 || value.length !== 0) {
      const newHeaders = { ...currentHeaders }
      newHeaders[name] = value
      setCurrentHeaders(newHeaders)
    }
  }

  function handleRemoveHeader (name) {
    const newHeaders = { ...currentHeaders }
    delete newHeaders[name]

    setCurrentHeaders(newHeaders)
  }
  return (
    <div className={styles.container}>
      <Forms.Field
        title='Headers'
        titleClassName={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}
      >
        <div className={styles.list}>
          <HeaderRow name='' value='' onAdd={handleAddHeader} onRemove={handleRemoveHeader} />
          {Object.entries(currentHeaders).map(([name, value]) => (
            <HeaderRow key={name} name={name} value={value} onRemove={handleRemoveHeader} />
          ))}
        </div>
      </Forms.Field>
    </div>

  )
}
