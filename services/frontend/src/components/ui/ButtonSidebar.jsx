import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styles from './ButtonSidebar.module.css'
import { PlatformaticIcon } from '@platformatic/ui-components'
import { SIZES, COLORS_BUTTON, BOX_SHADOW, UNDERLINE, HOVER_EFFECTS_BUTTONS, MAIN_DARK_BLUE, LARGE, MEDIUM, TRANSPARENT } from '@platformatic/ui-components/src/components/constants'

function ButtonSidebar ({
  textClass = '',
  paddingClass = '',
  altLabel = '',
  color = MAIN_DARK_BLUE,
  backgroundColor = TRANSPARENT,
  size = LARGE,
  disabled = false,
  bordered = true,
  fullWidth = false,
  hoverEffect = '',
  platformaticIcon = null,
  selected = false,
  fullRounded = false,
  hasUpdates = false,
  ...rest
}) {
  let contentClassName = `${styles.content} `
  if (paddingClass) {
    contentClassName += `${paddingClass} `
  } else {
    contentClassName += `${styles['button-' + size]} `
  }
  let baseButtonClassName = textClass
  baseButtonClassName += ` ${styles.button} `
  if (fullWidth) {
    baseButtonClassName += ` ${styles.fullWidth}`
  }
  if (fullRounded) {
    baseButtonClassName += ` ${styles.fullRounded}`
    contentClassName += ` ${styles.fullRounded} `
  }
  if (selected) baseButtonClassName += ' ' + styles[`selected-background-color-${color}`]
  const [hover, setHover] = useState(false)
  const [backgroundClassName, setBackgroundClassName] = useState(restClassName())
  const [buttonClassName, setButtonClassName] = useState(disabled ? buttonRestClassName : buttonActiveClassName())

  useEffect(() => {
    if (!disabled && !selected) {
      if (hover) {
        switch (hoverEffect) {
          case BOX_SHADOW:
            setBackgroundClassName(restClassName() + ' ' + styles[`hover-${BOX_SHADOW}-${backgroundColor}`])
            break
          case UNDERLINE:
            setBackgroundClassName(`${restClassName()} ${styles['underline-effect']}`)
            break
          default:
            break
        }
      } else {
        setBackgroundClassName(restClassName())
      }
    }
  }, [disabled, hover, hoverEffect, selected])

  useEffect(() => {
    if (disabled) {
      setButtonClassName(buttonRestClassName() + ` ${styles.cursorDefault}`)
    } else {
      setButtonClassName(buttonActiveClassName())
    }
  }, [disabled])

  function restClassName () {
    return `${styles['background-color-' + backgroundColor]} `
  }

  function buttonRestClassName () {
    if (!bordered) return ` ${styles['no-border']}`
    return styles[`bordered--${color}-30`]
  }

  function buttonActiveClassName () {
    if (!bordered) return ` ${styles['no-border']}`
    return styles[`bordered--${color}-100`]
  }

  return (
    <button className={`${baseButtonClassName} ${buttonClassName} ${restClassName()}`} disabled={disabled} alt={altLabel} {...rest} onMouseLeave={() => setHover(false)} onMouseOver={() => setHover(true)}>
      <div className={`${contentClassName} ${backgroundClassName}`}>
        {platformaticIcon ? <PlatformaticIcon iconName={platformaticIcon.iconName} color={platformaticIcon.color} data-testid='button-icon' size={platformaticIcon?.size ?? MEDIUM} onClick={null} disabled={disabled} inactive={(selected || disabled) ? false : !hover} /> : null}
      </div>
      {hasUpdates && (
        <span className={styles.dot} />
      )}
    </button>
  )
}

ButtonSidebar.propTypes = {
  /**
   * textClass
   */
  textClass: PropTypes.string,
  /**
   * paddingClass
   */
  paddingClass: PropTypes.string,
  /**
   * altLabel
   */
  altLabel: PropTypes.string,
  /**
   * color of text, icon and borders
   */
  color: PropTypes.oneOf(COLORS_BUTTON),
  /**
   * background color of the button
   */
  backgroundColor: PropTypes.oneOf(COLORS_BUTTON),
  /**
   * Size
   */
  size: PropTypes.oneOf(SIZES),
  /**
   * Disabled
   */
  disabled: PropTypes.bool,
  /**
   * Effect on hover
   */
  hoverEffect: PropTypes.oneOf(HOVER_EFFECTS_BUTTONS),
  /**
   * Apply border: default true
   */
  bordered: PropTypes.bool,
  /**
   * Full Width: default false
   */
  fullWidth: PropTypes.bool,
  /**
   * platformaticIcon: should be removed
   */
  platformaticIcon: PropTypes.shape({
    iconName: PropTypes.string,
    color: PropTypes.string,
    size: PropTypes.string
  }),
  /**
   * Selected: default false
   */
  selected: PropTypes.bool
}

export default ButtonSidebar
