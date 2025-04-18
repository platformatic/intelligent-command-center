import { ERROR_RED, MAIN_GREEN, TERTIARY_BLUE, WHITE, GIANTS_ORANGE, ELECTRIC_PURPLE, FLUORESCENT_CYAN } from '@platformatic/ui-components/src/components/constants'

export const getBackgroundPillsProps = (event, typographyStyles) => {
  let backgroundColor = WHITE
  let textClassName = typographyStyles.textWhite
  switch (event) {
    case 'USER_LOGIN':
      backgroundColor = TERTIARY_BLUE
      textClassName = typographyStyles.textTertiaryBlue
      break
    case 'APPLICATION_DEPLOY':
      backgroundColor = MAIN_GREEN
      textClassName = typographyStyles.textMainGreen
      break
    case 'APPLICATION_UNDEPLOY':
      backgroundColor = MAIN_GREEN
      textClassName = typographyStyles.textMainGreen
      break
    case 'APPLICATION_START':
      backgroundColor = MAIN_GREEN
      textClassName = typographyStyles.textMainGreen
      break
    case 'APPLICATION_DELETE':
      backgroundColor = ERROR_RED
      textClassName = typographyStyles.textErrorRed
      break
    case 'TAXONOMY_EXPORT':
      backgroundColor = GIANTS_ORANGE
      textClassName = typographyStyles.textGiantsOrange
      break
    case 'TAXONOMY_IMPORT':
      backgroundColor = ELECTRIC_PURPLE
      textClassName = typographyStyles.textElectricPurple
      break
    case 'APPLICATION_RESOURCES_UPDATE':
      backgroundColor = FLUORESCENT_CYAN
      textClassName = typographyStyles.textFluorescentCyan
      break
  }
  return {
    backgroundColor,
    textClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${textClassName}`
  }
}
