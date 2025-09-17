import React, { useEffect, useState } from 'react'
import styles from './RouteDetail.module.css'
import { Button, Forms, Icons } from '@platformatic/ui-components'
import { MEDIUM, RICH_BLACK, SMALL, WHITE } from '@platformatic/ui-components/src/components/constants'
import { CACHE_RECOMMENDATION_ROUTE_HISTORY_PAGE, CACHE_RECOMMENDATION_ROUTE_CACHE_TAG_PAGE } from '../pages'
import PageSection from '../../ui/PageSection'
import { callApiGetCacheRouteExample, callApiUpdateRecommendationRoute } from '../../../api/cache-recommendations'
import useICCStore from '../../../useICCStore'
import CacheHistory from './CacheHistory'
import { renderTTL, normalizeHistory } from './utils'
import callApi from '../../../api/common'

export default function RouteDetail ({ routeId, onPageChange = (page) => {} }) {
  const [route, setRoute] = useState(null)
  const { showSplashScreen } = useICCStore()
  const [routeExample, setRouteExample] = useState(null)
  const [selectedVaryHeaders, setSelectedVaryHeaders] = useState([])
  const [customTTL, setCustomTTL] = useState(null)
  const [configIsDirty, setConfigIsDirty] = useState(false)
  const [history, setHistory] = useState([])

  async function fetchRouteExample () {
    const res = await callApiGetCacheRouteExample(route.applicationId, route.route)
    setRouteExample(res)
  }

  async function fetchRouteDetails () {
    const res = await callApi('trafficInspector', `recommendationsRoutes/${routeId}`, 'GET')
    if (Object.keys(res.varyHeaders).length === 0) {
      res.varyHeaders = []
    } else {
      res.varyHeaders = Object.values(res.varyHeaders)
    }
    setRoute(res)
  }
  useEffect(() => {
    fetchRouteDetails()
  }, [])

  useEffect(() => {
    if (!route) {
      return
    }
    fetchRouteExample()
  }, [route])
  useEffect(() => {
    if (!routeExample) {
      return
    }
    setSelectedVaryHeaders(route.varyHeaders)
    setHistory(normalizeHistory(route.scores.scoresHistory))
    setCustomTTL(route.ttl)
  }, [routeExample])
  function renderRouteConfiguration () {
    function renderTTLOptions () {
      // from the default array we remove route.ttl and put it at the beginning
      const options = [10, 20, 30, 40, 50, 60].filter((option) => option !== route.ttl)
      options.unshift(route.ttl)
      return options
    }
    if (!routeExample) {
      return null
    }
    return (
      <div className={styles.configSectionContainer}>
        <ConfigSection title='Vary Headers' secondaryText='You can select one or multiple Vary headers'>

          <div className={styles.varyHeaders}>
            {Object.keys(routeExample.request.headers).map((header) => (
              <HeaderButton
                key={header}
                label={header}
                onClick={(header) => {
                  if (selectedVaryHeaders.includes(header)) {
                    setSelectedVaryHeaders(prev => prev.filter(h => h !== header))
                  } else {
                    setSelectedVaryHeaders(prev => [...prev, header])
                  }
                  setConfigIsDirty(true)
                }}
                selected={selectedVaryHeaders.includes(header)}
              />
            ))}
          </div>
        </ConfigSection>

        <ConfigSection title='Time to Live' secondaryText='We recommend you the best TTL for this cache but you can set the value you prefer.'>
          <div className={renderTTL(route.ttl)}>
            <TTLButtons
              values={renderTTLOptions()}
              selectedValue={customTTL}
              onValueChange={(value) => {
                setCustomTTL(value)
                setConfigIsDirty(true)
              }}
            />
          </div>
        </ConfigSection>
      </div>
    )
  }

  function renderRouteDataButtons () {
    return (
      <Button
        label='Route History'
        onClick={() => onPageChange(CACHE_RECOMMENDATION_ROUTE_HISTORY_PAGE)}
        color={WHITE}
      />
    )
  }
  function renderRouteConfigurationButtons () {
    return (
      <Button
        label='Apply Configuration'
        onClick={async () => {
          const payload = {
            recommendationId: route.recommendationId,
            routeId: route.id,
            selected: route.selected,
            ttl: customTTL === null ? route.ttl : customTTL,
            varyHeaders: selectedVaryHeaders
          }
          await callApiUpdateRecommendationRoute(payload)
          showSplashScreen({
            title: 'Configuration updated',
            content: 'The route configuration has been updated.',
            type: 'success',
            onDismiss: () => {
              setConfigIsDirty(false)
              fetchRouteDetails()
              // onPageChange(CACHE_RECOMMENDATION_DETAIL_PAGE)
            }
          })
        }}
        color={WHITE}
        size={SMALL}
        disabled={!configIsDirty}
      />
    )
  }
  if (!route || !routeExample) {
    return null
  }
  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <div className={styles.routeName}>
          <Icons.RoutingIcon size={MEDIUM} color={WHITE} />
          {route.route}
        </div>

        <div className={styles.routeDetails}>
          <div>
            Cache Tag: <span className={styles.routeDetailsValue}>{route.cacheTag}</span> | Time to live: <span className={styles.routeDetailsValue}>{renderTTL(route.ttl)}</span>
          </div>
          <div>
            <Button
              label='Edit Cache Tag'
              onClick={() => onPageChange(CACHE_RECOMMENDATION_ROUTE_CACHE_TAG_PAGE)}
              color={RICH_BLACK}
              backgroundColor={WHITE}
            />
          </div>
        </div>
      </div>

      <div className={styles.routeConfiguration}>
        <PageSection title='Route Data' buttons={renderRouteDataButtons()}>
          <CacheHistory history={history} layout='horizontal' />
        </PageSection>
      </div>
      <div className={styles.routeConfiguration}>
        <PageSection title='Route Configuration' buttons={renderRouteConfigurationButtons()}>
          {renderRouteConfiguration()}
        </PageSection>
      </div>
    </div>
  )
}

function HeaderButton ({ label, onClick, selected }) {
  return (
    <div
      className={`${styles.headerButton} ${selected ? styles.selected : ''}`}
      onClick={(event) => {
        event.stopPropagation()
        onClick(label)
      }}
    >
      {label}
    </div>
  )
}

function ConfigSection ({ title, secondaryText, children }) {
  return (
    <div className={styles.configSection}>
      <div className={styles.configHeader}>
        <span className={styles.configTitle}>{title}</span>
      </div>
      <span className={styles.secondaryText}>{secondaryText}</span>
      {children}
    </div>
  )
}
function TTLButtons ({ values, onValueChange, selectedValue }) {
  return (
    <div className={styles.ttlButtons}>
      {values.map((value) => (
        <HeaderButton
          key={value}
          label={renderTTL(value)}
          onClick={() => {
            onValueChange(value)
          }}
          selected={value === selectedValue}
        />
      ))}
      <CustomButton
        onValueChange={(value) => {
          onValueChange(value)
        }}
        onSelect={() => {
          onValueChange(null)
        }}
      />
    </div>
  )
}
function CustomButton ({ onValueChange, onSelect }) {
  const [value, setValue] = useState('')
  const [isSelected, setIsSelected] = useState(false)
  function handleChange (event) {
    setValue(event.target.value)
    onValueChange(event.target.value)
  }
  return (
    <div className={styles.customButton}>
      <div
        className={`${styles.headerButton} ${isSelected ? styles.selected : ''}`}
        onClick={(event) => {
          event.stopPropagation()
          if (!isSelected) {
            onSelect()
          }
          setIsSelected(!isSelected)
        }}
      >
        Custom
      </div>
      {isSelected && (
        <Forms.Input
          name='customTTL'
          borderColor={WHITE}
          value={value}
          inputTextClassName={styles.inputText}
          backgroundColor={RICH_BLACK}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
