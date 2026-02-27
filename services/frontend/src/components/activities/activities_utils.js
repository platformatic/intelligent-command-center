import pillStyles from './ActivitiesPills.module.css'

export const getBackgroundPillsProps = (event, typographyStyles) => {
  let backgroundClassName = pillStyles.bgWhite
  let textClassName = pillStyles.textWhite
  switch (event) {
    case 'USER_LOGIN':
      backgroundClassName = pillStyles.bgTertiaryBlue
      textClassName = pillStyles.textTertiaryBlue
      break
    case 'APPLICATION_DEPLOY':
      backgroundClassName = pillStyles.bgMainGreen
      textClassName = pillStyles.textMainGreen
      break
    case 'APPLICATION_UNDEPLOY':
      backgroundClassName = pillStyles.bgMainGreen
      textClassName = pillStyles.textMainGreen
      break
    case 'APPLICATION_START':
      backgroundClassName = pillStyles.bgMainGreen
      textClassName = pillStyles.textMainGreen
      break
    case 'APPLICATION_DELETE':
      backgroundClassName = pillStyles.bgErrorRed
      textClassName = pillStyles.textErrorRed
      break
    case 'TAXONOMY_EXPORT':
      backgroundClassName = pillStyles.bgGiantsOrange
      textClassName = pillStyles.textGiantsOrange
      break
    case 'TAXONOMY_IMPORT':
      backgroundClassName = pillStyles.bgElectricPurple
      textClassName = pillStyles.textElectricPurple
      break
    case 'APPLICATION_RESOURCES_UPDATE':
      backgroundClassName = pillStyles.bgFluorescentCyan
      textClassName = pillStyles.textFluorescentCyan
      break
    case 'APPLICATION_CREATE':
      backgroundClassName = pillStyles.bgAmber
      textClassName = pillStyles.textAmber
      break
    case 'SCALED_UP':
      backgroundClassName = pillStyles.bgTeal
      textClassName = pillStyles.textTeal
      break
    case 'SCALED_DOWN':
      backgroundClassName = pillStyles.bgRose
      textClassName = pillStyles.textRose
      break
    case 'CONFIG_UPDATE':
      backgroundClassName = pillStyles.bgLime
      textClassName = pillStyles.textLime
      break
    case 'VERSION_REGISTRY_UPDATE':
      backgroundClassName = pillStyles.bgIndigo
      textClassName = pillStyles.textIndigo
      break
  }
  return {
    backgroundClassName,
    textClassName: `${typographyStyles.desktopOtherOverlineSmallest} ${textClassName}`
  }
}
