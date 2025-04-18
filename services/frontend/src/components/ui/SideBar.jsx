import React from 'react'
import PropTypes from 'prop-types'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './SideBar.module.css'
import ButtonSidebar from '~/components/ui/ButtonSidebar'
import { DIRECTION_RIGHT, MEDIUM, POSITION_CENTER, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
import { TooltipAbsolute } from '@platformatic/ui-components'
import { NavLink, useLocation, useMatches } from 'react-router-dom'

function renderButton (item) {
  const routes = useMatches()
  const location = useLocation()

  // TODO: better way to check if the item is selected
  const isSelected = (location.pathname === item.link) ||
    (item.label === 'App Details' && routes[routes.length - 1].id === 'application/details') || // for app detail home page
    (item.link === 'scheduled-jobs' && location.pathname.includes('scheduled-jobs')) || // for scheduled jobs detail page
    (location.pathname.endsWith(item.link) && location.pathname !== item.link && item.link !== '') // check if the link is a subpath

  return (
    <NavLink to={`${item.link}`}>
      <div
        className={`${commonStyles.tinyFlexBlock} ${commonStyles.itemsCenter} ${styles.item} ${typographyStyles.desktopBodySmallest} ${typographyStyles.textWhite} ${typographyStyles.textCenter}`}
      >
        <ButtonSidebar
          altLabel={item.label}
          paddingClass={commonStyles.buttonSquarePadding}
          color={WHITE}
          backgroundColor={TRANSPARENT}
          platformaticIcon={{ size: MEDIUM, iconName: item.iconName, color: WHITE }}
          selected={isSelected}
          disabled={item.disabled || false}
          bordered={false}
          fullRounded
          hasUpdates={item.hasUpdates}
        />
      </div>
    </NavLink>

  )
}
function SideBar ({
  topItems = [],
  bottomItems = []
}) {
  function Item ({ item }) {
    if (item.disabled) {
      return (
        renderButton(item)
      )
    }

    return (
      <TooltipAbsolute
        tooltipClassName={styles.tooltipSidebar}
        content={(<span className={`${typographyStyles.desktopBodySmallest}`}>{item.label}</span>)}
        offset={10}
        position={POSITION_CENTER}
        direction={DIRECTION_RIGHT}
      >
        {renderButton(item)}
      </TooltipAbsolute>
    )
  }
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {topItems.map((item, index) => <Item item={item} key={index} />)}
      </div>
      <div className={styles.content}>
        {bottomItems.map((item, index) => <Item item={item} key={index} />)}
      </div>
    </div>
  )
}

SideBar.propTypes = {
  /**
   * selected
   */
  selected: PropTypes.string,
  /**
   * topItems
   */
  topItems: PropTypes.array,
  /**
   * bottomItems
   */
  bottomItems: PropTypes.array
}

export default SideBar
