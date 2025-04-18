import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { ACTIVE_AND_INACTIVE_STATUS, BLACK_RUSSIAN, SMALL, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { BorderedBox, Button } from '@platformatic/ui-components'
import styles from './RowDeployment.module.css'
import { getFormattedTimeAndDate } from '~/utilities/dates'
import { getGithubUserInfo } from '~/api'

function RowDeployment ({
  main = true,
  historyMode = true,
  mainIteration = '-',
  taxonomyName = '-',
  commitMessage = '-',
  deployedOn = '',
  applicationName = '',
  commitUserEmail = '-',
  index = 0,
  taxonomyId = '-',
  onClickTaxonomy = () => {}
}) {
  const [gravatarUrl, setGravatarUrl] = useState('./githubUser.png')

  useEffect(() => {
    if (commitUserEmail !== '-') {
      async function getAvatarUrl () {
        try {
          const data = await getGithubUserInfo(commitUserEmail)
          const data1 = await data.json()
          if ((data1.items?.length ?? 0) > 0 && data1.items[0]?.avatar_url) {
            setGravatarUrl(`${data1.items[0]?.avatar_url}&s=24`)
          }
        } catch (error) {
          console.error(`Error getting image gravatar: ${error}`)
        }
      }
      getAvatarUrl()
    }
  }, [commitUserEmail])

  return (
    <div className={styles.rowDeployment}>
      {!historyMode && (
        <div className={`${styles.tableSmallDescription}`}>
          <div className={styles.tableCell}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Application Name</span>
          </div>
          <div className={`${styles.tableCell}`}>
            <div className={`${styles.customSmallFlexRow}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{applicationName}</span>
            </div>
          </div>
        </div>)}

      <div className={`${styles.tableSmallDescription}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Deployment</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.fullWidth}`}>
            <BorderedBox color={TRANSPARENT} backgroundColor={BLACK_RUSSIAN} classes={styles.mainIteration}>
              <div className={styles.mainIterationContent}>
                <span className={`${typographyStyles.desktopBodySemibold} ${index === 0 ? '' : typographyStyles.opacity70} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{mainIteration}</span>
              </div>
            </BorderedBox>
            <div className={`${commonStyles.flexBlockNoGap}`}>
              <p className={`${typographyStyles.desktopBodySmallSemibold} ${typographyStyles.textWhite}`}>{taxonomyName}</p>
              <p className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>
                <span className={` ${typographyStyles.opacity70} `}>Manually deployed</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.tableSmall}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Deployed on (GMT)</span>
        </div>
        <div className={styles.tableCell}>
          <div className={styles.customSmallFlexRow}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{getFormattedTimeAndDate(deployedOn)}</span>
          </div>
        </div>
      </div>
      {historyMode && (
        <div className={`${styles.tableSmall}`}>
          <div className={styles.tableCell}>
            <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${styles.ellipsis}`}>Commit Message</span>
          </div>
          <div className={styles.tableCell}>
            <div className={`${styles.customSmallFlexRow}`}>
              <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>{commitMessage}</span>
            </div>
          </div>
        </div>
      )}
      <div className={`${styles.tableSmallDescription}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>Last Commit by</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${commonStyles.tinyFlexRow}`}>
            {commitUserEmail !== '-' && <div className={commonStyles.githubUser} style={{ backgroundImage: `url(${gravatarUrl}` }} />}
            <div className={`${commonStyles.flexGrow}`}>
              <p className={`${typographyStyles.desktopBodySmall} ${commitUserEmail === '-' ? typographyStyles.opacity70 : ''} ${typographyStyles.textWhite} ${typographyStyles.ellipsis}`}>{commitUserEmail}</p>
            </div>
          </div>
        </div>
      </div>
      <div className={`${styles.tableSmallDescription}`}>
        <div className={styles.tableCell}>
          <span className={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}>&nbsp;</span>
        </div>
        <div className={`${styles.tableCell}`}>
          <div className={`${commonStyles.tinyFlexRow} ${commonStyles.itemsCenter} ${commonStyles.justifyEnd}`}>
            <Button
              label={main ? 'View Taxonomy' : 'View Preview'}
              type='button'
              color={WHITE}
              backgroundColor={TRANSPARENT}
              hoverEffect={ACTIVE_AND_INACTIVE_STATUS}
              paddingClass={commonStyles.smallButtonPadding}
              textClass={typographyStyles.desktopButtonSmall}
              onClick={() => onClickTaxonomy(taxonomyId, main)}
              platformaticIconAfter={{ iconName: 'InternalLinkIcon', color: WHITE, size: SMALL }}
              bordered={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

RowDeployment.propTypes = {
  /**
   * main
    */
  main: PropTypes.bool,
  /**
   * mainIteration
    */
  mainIteration: PropTypes.number,
  /**
   * taxonomyName
    */
  taxonomyName: PropTypes.string,
  /**
   * historyMode
    */
  historyMode: PropTypes.bool,
  /**
   * index
    */
  index: PropTypes.number,
  /**
   * commitMessage
    */
  commitMessage: PropTypes.string,
  /**
   * deployedOn
    */
  deployedOn: PropTypes.string,
  /**
   * applicationName
    */
  applicationName: PropTypes.string,
  /**
   * commitUserEmail
    */
  commitUserEmail: PropTypes.string,
  /**
   * taxonomyId
    */
  taxonomyId: PropTypes.string,
  /**
   * onClickTaxonomy
    */
  onClickTaxonomy: PropTypes.func
}

export default RowDeployment
