import { TERTIARY_BLUE, FLUORESCENT_CYAN } from '@platformatic/ui-components/src/components/constants'

export const getBackgroundPillsProps = (event, typographyStyles) => {
  let backgroundColor = TERTIARY_BLUE
  let textClassName = typographyStyles.textTertiaryBlue

  if (event !== 'NEW POD') {
    backgroundColor = FLUORESCENT_CYAN
    textClassName = typographyStyles.textFluorescentCyan
  }
  return {
    backgroundColor,
    textClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${textClassName}`
  }
}
