import { ERROR_RED, MAIN_GREEN, WHITE } from '@platformatic/ui-components/src/components/constants'

export const getBackgroundPillsProps = (event, typographyStyles) => {
  let backgroundColor = WHITE
  let textClassName = typographyStyles.textWhite
  switch (event) {
    case 'SUCCESS':
      backgroundColor = MAIN_GREEN
      textClassName = typographyStyles.textMainGreen
      break
    case 'ERROR':
      backgroundColor = ERROR_RED
      textClassName = typographyStyles.textErrorRed
      break
  }
  return {
    backgroundColor,
    textClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${textClassName}`
  }
}

export const convertBytesToKbs = (bytes) => {
  return Math.ceil(bytes / 1024)
}
