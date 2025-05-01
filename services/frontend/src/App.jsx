import React, { useState, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import './App.css'
import CustomAuthProvider from '~/auth/CustomAuthProvider'
import {
  getUser,
  getPackageVersions
} from '~/api'

import { LoadingSpinnerV2, SplashScreen } from '@platformatic/ui-components'
import useICCStore from '~/useICCStore'
import { getRouter } from './Router'

import loadingSpinnerStyles from '~/styles/LoadingSpinnerStyles.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import typographyStyles from '~/styles/Typography.module.css'
import styles from './App.module.css'

export default function App () {
  const globalState = useICCStore()
  const { user, setUser, isAuthenticated, setIsAuthenticated, setPackageVersions, setCurrentWindowWidth, setEnableSidebarFirstLevel, splashScreen, hideSplashScreen } = globalState
  const [innerLoading, setInnerLoading] = useState(false)

  useEffect(() => {
    async function getUserLocal () {
      setInnerLoading(true)
      try {
        const response = await getUser()
        if (response.status === 401 && isAuthenticated) {
          // logout user
          setUser({})
          setIsAuthenticated(false)
          window.location.href = '/'
        }
        const data = await response.json()
        setIsAuthenticated(true)
        if (data.username) {
          setUser(data)
        } else {
          setUser({})
          setIsAuthenticated(false)
          setInnerLoading(false)
        }
      } catch (error) {
        console.error('Error on user', error)
        setInnerLoading(false)
      }
    }
    getUserLocal()
  }, [])

  useEffect(() => {
    setCurrentWindowWidth(window.innerWidth)

    const handleResize = () => {
      setCurrentWindowWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      async function loadPackageVersions () {
        try {
          const response = await getPackageVersions()
          const data = await response.json()
          if (data?.package_versions) {
            setPackageVersions(data.package_versions)
          }
          setEnableSidebarFirstLevel(true)
        } catch (error) {
          console.error('Error on loadPackageVersions', error)
        } finally {
          setInnerLoading(false)
        }
      }
      loadPackageVersions()
    }
  }, [isAuthenticated])

  if (innerLoading) {
    return (
      <LoadingSpinnerV2
        loading
        applySentences={{
          containerClassName: `${commonStyles.mediumFlexBlock} ${commonStyles.itemsCenter}`,
          sentences: [{
            style: `${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`,
            text: 'Loading ...'
          }]
        }}
        containerClassName={loadingSpinnerStyles.loadingSpinner}
        spinnerProps={{ size: 40, thickness: 3 }}
      />
    )
  }

  const router = getRouter()
  return (
    <CustomAuthProvider value={{ user, setUser, isAuthenticated, setIsAuthenticated }}>
      {splashScreen.show && (
        <div className={styles.splashScreenContainer}>
          <SplashScreen
            title={splashScreen.title}
            success={splashScreen.type === 'success'}
            timeout={splashScreen.timeout}
            onDestroyed={() => {
              if (splashScreen.onDismiss) {
                splashScreen.onDismiss()
              }
              hideSplashScreen()
            }}
          >
            <div>{splashScreen.content}</div>
          </SplashScreen>
        </div>
      )}
      <RouterProvider router={router} />
    </CustomAuthProvider>
  )
}
