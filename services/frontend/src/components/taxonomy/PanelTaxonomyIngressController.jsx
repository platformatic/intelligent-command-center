import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './PanelTaxonomyIngressController.module.css'
import Icons from '@platformatic/ui-components/src/components/icons'
import { OPACITY_30, SMALL, WHITE, TRANSPARENT, DIRECTION_LEFT, MEDIUM, BLACK_RUSSIAN, RICH_BLACK, DULLS_BACKGROUND_COLOR } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, ButtonFullRounded, Tooltip, VerticalSeparator } from '@platformatic/ui-components'
import tooltipStyles from '~/styles/TooltipStyles.module.css'

function Application ({ id = '-', path = '-', applicationName = '-' }) {
  return (
    <BorderedBox classes={styles.entrypointTemplate} color={TRANSPARENT} backgroundColor={RICH_BLACK}>
      <div className={`${commonStyles.miniFlexBlock} ${commonStyles.fullWidth}`}>
        <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{applicationName}</p>

        <div className={`${commonStyles.smallFlexRow} ${commonStyles.itemsCenter} ${commonStyles.fullWidth} ${styles.smallLeftMargin}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Path:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>{path}</span>
          </div>

          <VerticalSeparator color={WHITE} backgroundColorOpacity={OPACITY_30} classes={styles.verticalSeparator} />

          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter}`}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`}>Entrypoint:</span>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} `}>{id}</span>
          </div>
        </div>

      </div>
    </BorderedBox>
  )
}

function PanelTaxonomyIngressController ({ name = '', entrypoints = [] }) {
  return (
    <div className={`${commonStyles.smallFlexBlock} ${commonStyles.fullWidth}`}>
      <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
        <Icons.InternetIcon
          color={WHITE}
          size={MEDIUM}
        />
        <div>
          <p className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Ingress Controller {name} </p>
        </div>
      </div>

      <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.boxEntrypointsContainer}>
        <div className={`${commonStyles.tinyFlexBlock} ${commonStyles.fullWidth}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyBetween} ${commonStyles.fullWidth}`}>
            <span className={`${typographyStyles.desktopBodyLargeSemibold} ${typographyStyles.textWhite}`}>Applications</span>
            <Tooltip
              tooltipClassName={tooltipStyles.tooltipDarkStyle}
              content={(<span>List of applications linked to ingress controller <br />with their respective entrypoint and paths.</span>)}
              offset={-250}
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
          {entrypoints.map((application, index) => (<Application key={`${entrypoints.id}-${index}`} {...application} />))}
        </div>
      </BorderedBox>
    </div>
  )
}

export default PanelTaxonomyIngressController
