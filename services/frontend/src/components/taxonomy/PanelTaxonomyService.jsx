import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PanelTaxonomyService.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { SMALL, WHITE, TRANSPARENT, DIRECTION_LEFT, MEDIUM, BLACK_RUSSIAN, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import JavascriptIcon from '~/components/ui/icons/JavascriptIcon'
import TypescriptIcon from '~/components/ui/icons/TypescriptIcon'
import { BorderedBox, ButtonFullRounded, Tooltip } from '@platformatic/ui-components'
import tooltipStyles from '~/styles/TooltipStyles.module.css'

function Dependency ({ name }) {
  return (
    <BorderedBox classes={styles.serviceTemplate} color={TRANSPARENT} backgroundColor={RICH_BLACK}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <div className={`${commonStyles.tinyFlexRow}`}>
          <Icons.LogOutIcon color={WHITE} size={SMALL} />
          <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${typographyStyles.ellipsis} ${styles.templateName}`} title={name}>{name}</p>
        </div>
      </div>
    </BorderedBox>
  )
}

function Template ({ type }) {
  return (
    <BorderedBox classes={styles.serviceTemplate} color={TRANSPARENT} backgroundColor={RICH_BLACK}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyBetween}`}>
        <div className={`${commonStyles.tinyFlexRow}`}>
          <Icons.StackablesTemplateIcon color={WHITE} size={SMALL} />
          <p className={`${typographyStyles.desktopBody} ${typographyStyles.textWhite} ${typographyStyles.textCenter} ${typographyStyles.ellipsis} ${styles.templateName}`} title={type}>{type}</p>
        </div>
        {/* <PlatformaticIcon iconName='ExpandIcon' color={WHITE} size={SMALL} onClick={() => window.open(`https://marketplace.platformatic.dev/#/detail/template/${type}`, '_blank')} internalOverHandling /> */}
      </div>
    </BorderedBox>
  )
}

function PanelTaxonomyService ({ name = '', type = '', dependencies = [] }) {
  function getIcon () {
    const typeScript = false
    return typeScript
      ? (
        <>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Typescript</span>
          <TypescriptIcon />
        </>
        )
      : (
        <>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Javascript</span>
          <JavascriptIcon />
        </>
        )
  }

  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
          <Icons.PlatformaticServiceIcon
            color={WHITE}
            size={MEDIUM}
          />
          <div>
            <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>{name} </p>
          </div>
        </div>

        <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallMarginLeft}`}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Language:</span>
          {getIcon()}
        </div>
      </div>

      <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth} ${styles.contentScrollable}`}>

        <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxServicesContainer}>
          <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
            <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${commonStyles.positionRelative}`}>
              <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Template</span>
              <Tooltip
                tooltipClassName={tooltipStyles.tooltipDarkStyle}
                content={(<span>The list of templates contained<br /> in the selected service</span>)}
                offset={-166}
                direction={DIRECTION_LEFT}
                immediateActive={false}
              >
                <ButtonFullRounded
                  buttonClassName={commonStyles.backgroundTransparent}
                  iconName='CircleExclamationIcon'
                  iconSize={SMALL}
                  iconColor={WHITE}
                  hoverEffect={DULLS_BACKGROUND_COLOR}
                  bordered={false}
                />
              </Tooltip>
            </div>
            <Template type={type} key={name} />
          </div>
        </BorderedBox>

        {dependencies.length > 0 && (
          <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxServicesContainer}>
            <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
              <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth} ${commonStyles.positionRelative}`}>
                <span className={`${typographyStyles.desktopBodySemibold} ${typographyStyles.textWhite}`}>Dependencies</span>
                <Tooltip
                  tooltipClassName={tooltipStyles.tooltipDarkStyle}
                  content={(<span>List of dependencies<br /> of the selected service</span>)}
                  offset={-120}
                  direction={DIRECTION_LEFT}
                  immediateActive={false}
                >
                  <ButtonFullRounded
                    buttonClassName={commonStyles.backgroundTransparent}
                    iconName='CircleExclamationIcon'
                    iconSize={SMALL}
                    iconColor={WHITE}
                    hoverEffect={DULLS_BACKGROUND_COLOR}
                    bordered={false}
                  />
                </Tooltip>
              </div>
              {dependencies.map(dependency => <Dependency key={dependency.id} name={dependency.id} />)}
            </div>

          </BorderedBox>
        )}
      </div>
    </div>
  )
}

export default PanelTaxonomyService
