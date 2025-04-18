import React, { useEffect, useState } from 'react'
import {
  PAGE_APPS,
  ALL_ACTIVITIES_PATH,
  ALL_DEPLOYMENTS_PATH,
  GENERAL_SETTING_PATH,
  HOME_PATH,
  PREVIEWS_PATH,
  TAXONOMY_PATH,
  CONFIGURE_INGRESS_PATHS_PATH,
  PAGE_PROFILE
} from '~/ui-constants'
import styles from './HomeContainer.module.css'
import SideBar from '~/components/ui/SideBar'
import useICCStore from '~/useICCStore'
import { useNavigate, useLocation, Outlet, useNavigation } from 'react-router-dom'
import { CACHING_PATH, PAGE_RECOMMENDATION_HISTORY } from '../ui-constants'
import { callGetUpdatesApi } from '../api/updates'
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
  const { currentPage, setCurrentPage, enableSidebarFirstLevel, updates, setUpdates } = globalState
  const navigate = useNavigate()
  const location = useLocation()

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
    link: '/previews',
    label: 'Previews',
    iconName: 'CodeTestingIcon',
    disabled: !enableSidebarFirstLevel
  }, {
    link: '/deployments',
    label: 'Deployments',
    iconName: 'RocketIcon',
    disabled: !enableSidebarFirstLevel
  }, {
    link: '/activities',
    label: 'Activities',
    iconName: 'CheckListIcon',
    disabled: !enableSidebarFirstLevel
  }, {
    link: '/ingress-paths',
    label: 'Configure Ingress paths',
    iconName: 'IngressControllIcon',
    disabled: !enableSidebarFirstLevel
  }]

  /** @type {[SidebarItem[], React.Dispatch<SidebarItem[]>]} */
  const [topItems, setTopItems] = useState(defaultTopItems)

  useEffect(() => {
    if (location.pathname === '/' && !currentPage) {
      navigate(HOME_PATH)
      setCurrentPage(PAGE_APPS)
    }
    if (location.pathname !== '/' && !currentPage) {
      if (!enableSidebarFirstLevel) {
        navigate(HOME_PATH)
        setCurrentPage(PAGE_APPS)
        return
      }

      const path = [
        ALL_ACTIVITIES_PATH,
        ALL_DEPLOYMENTS_PATH,
        GENERAL_SETTING_PATH,
        HOME_PATH,
        PREVIEWS_PATH,
        TAXONOMY_PATH,
        CONFIGURE_INGRESS_PATHS_PATH,
        PAGE_PROFILE,
        CACHING_PATH,
        PAGE_RECOMMENDATION_HISTORY
      ].find(value => value === location.pathname)

      if (path) {
        navigate(path)
        setCurrentPage(path)
      }
    }
    getUpdates()
  }, [location, currentPage, enableSidebarFirstLevel])

  useEffect(() => {
    getUpdates()
  }, [])

  // Handle updates to refresh sidebar items
  useEffect(() => {
    const recommendationUpdates = updates['cluster-manager']?.filter((u) => {
      return u.type === 'new-recommendation'
    }).length > 0
    const newValues = []
    topItems.forEach((item) => {
      if (item.name === PAGE_RECOMMENDATION_HISTORY) {
        item.hasUpdates = recommendationUpdates // adds the green dot if has updates, removes it if not
      }
      newValues.push(item)
    })
    setTopItems(newValues)
  }, [updates])

  // Get application updates
  async function getUpdates () {
    const updates = await callGetUpdatesApi()
    setUpdates(updates)
  }
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
          selected={currentPage}
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
