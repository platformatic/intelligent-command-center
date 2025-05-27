import React, { useEffect, useState } from 'react'

import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import useICCStore from '~/useICCStore'
import { Outlet, useNavigation } from 'react-router-dom'
import { LoadingSpinnerV2 } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
/** @typedef SidebarItem
 * @property {string} name
 * @property {string} label
 * @property {string} iconName
 * @property {boolean} [hasUpdates]
 * @property {boolean} [disabled]
 * @property {function} onClick
**/

export default function HomeContainer () {
  const navigation = useNavigation()
  const globalState = useICCStore()
  const { enableSidebarFirstLevel } = globalState

  const defaultTopItems = [{
    link: '/recommendations-history',
    label: 'Recommendations History',
    iconName: 'AppOptimizedIcon'
  }, {
    link: '/',
    label: 'Applications',
    iconName: 'AllAppsIcon'
  }, {
    link: '/taxonomy',
    label: 'Taxonomy',
    iconName: 'TaxonomyIcon',
    disabled: !enableSidebarFirstLevel
  }, {
    link: '/caching',
    label: 'Caching',
    iconName: 'CachingIcon',
    disabled: !enableSidebarFirstLevel
  }, {
    link: '/deployments',
    label: 'Deployments',
    iconName: 'RocketIcon',
    disabled: !enableSidebarFirstLevel
  }]

  const [topItems, setTopItems] = useState([])

  useEffect(() => {
    setTopItems(defaultTopItems)
  }, [])

  /** @type {[SidebarItem[], React.Dispatch<SidebarItem[]>]} */

  // Handle updates to refresh sidebar items
  // TODO: re-implement this after websocket is implemented
  //

  // useEffect(() => {
  //   const recommendationUpdates = updates['cluster-manager']?.filter((u) => {
  //     return u.type === 'new-recommendation'
  //   }).length > 0
  //   const newValues = []
  //   topItems.forEach((item) => {
  //     if (item.name === PAGE_RECOMMENDATION_HISTORY) {
  //       item.hasUpdates = recommendationUpdates // adds the green dot if has updates, removes it if not
  //     }
  //     newValues.push(item)
  //   })
  //   setTopItems(newValues)
  // }, [updates])

  if (navigation.state === 'loading') {
    return (
      <LoadingSpinnerV2
        loading
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Loading your application...'
          }, {
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite} ${typographyStyles.opacity70}`,
            text: 'This process will just take a few seconds.'
          }]
        }}
        containerClassName={styles.loadingSpinner}
        spinnerProps={{ size: 40, thickness: 3 }}
      />
    )
  }
  return (
    <>
      <div className={styles.content}>
        <SideBar
          topItems={topItems}
          bottomItems={[{
            link: '/profile',
            label: 'My Profile',
            iconName: 'UserIcon'
          }, {
            link: '/settings',
            label: 'Settings',
            iconName: 'GearIcon'
          }]}
        />
        <Outlet />
      </div>
    </>
  )
}
