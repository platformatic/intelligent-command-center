import { Button, Forms, SearchBarV2 } from '@platformatic/ui-components'
import React, { useEffect, useState } from 'react'
import typographyStyles from '~/styles/Typography.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './CachedEntries.module.css'
import { callApiGetApplicationHttpCache, callApiInvalidateApplicationHttpCache } from '../../api'
import NoDataFound from '~/components/ui/NoDataFound'
import OriginLine from './OriginLine'
import { ERROR_RED, RICH_BLACK, TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'
export default function CachedEntries ({
  application = null,
  onCacheEntrySelected = async () => {},
  hideChart = () => {}
}) {
  const [checkedEntries, setCheckedEntries] = useState([])
  const [httpCacheEntries, setHttpCacheEntries] = useState({})
  const [nextJSCacheFetchEntries, setNextJSCacheFetchEntries] = useState({})
  const [nextJSCachePageEntries, setNextJSCachePageEntries] = useState({})
  const [allCacheEntries, setAllCacheEntries] = useState([])
  const [searchValue, setSearchValue] = useState('')
  const [cachedEntriesToInvalidate, setCachedEntriesToInvalidate] = useState([])
  const [selectedCacheType, setSelectedCacheType] = useState('all')
  const [expanded, setExpanded] = useState({})

  const cacheTypeFilterOptions = [
    {
      label: 'All caches',
      value: 'all'
    },
    {
      label: 'Next.js cache',
      value: 'next'
    },
    {
      label: 'HTTP cache',
      value: 'http'
    }
  ]
  const POLLING_INTERVAL = 5000
  let pollingInterval

  async function invalidate (entries = []) {
    const res = await callApiInvalidateApplicationHttpCache(application.id, entries)
    if (res === true) {
      setCachedEntriesToInvalidate([])
    }
  }

  let debouncer = null
  async function handleSearch (data) {
    if (debouncer) {
      clearTimeout(debouncer)
    }
    debouncer = setTimeout(() => {
      setSearchValue(data)
      clearTimeout(debouncer)
    }, 200)
  }

  useEffect(() => {
    async function updateData () {
      clearInterval(pollingInterval)
      const groupedCache = await getApplicationCacheEntries()
      setHttpCacheEntries(groupedCache.httpCacheEntries)
      setNextJSCacheFetchEntries(groupedCache.nextJSCacheFetchEntries)
      setNextJSCachePageEntries(groupedCache.nextJSCachePageEntries)
      pollingInterval = setInterval(async () => {
        const groupedCache = await getApplicationCacheEntries()
        setHttpCacheEntries(groupedCache.httpCacheEntries)
        setNextJSCacheFetchEntries(groupedCache.nextJSCacheFetchEntries)
        setNextJSCachePageEntries(groupedCache.nextJSCachePageEntries)
      }, POLLING_INTERVAL)
    }
    updateData()
    return () => {
      clearInterval(pollingInterval)
    }
  }, [searchValue, selectedCacheType])

  useEffect(() => {
    async function init () {
      setSelectedCacheType(cacheTypeFilterOptions[0])
    }
    init()

    return () => {
      clearInterval(pollingInterval)
    }
  }, [])

  async function getApplicationCacheEntries () {
    const apiOptions = {
      limit: 100,
      offset: 0,
      search: searchValue
    }
    const cache = await callApiGetApplicationHttpCache(application.id, apiOptions)
    const all = cache.server.concat(cache.client)
    let filtered = all
    if (selectedCacheType.value !== 'all') {
      filtered = filtered
        // filter by the selected type
        .filter((entry) => {
          return entry.kind.toLowerCase().startsWith(selectedCacheType.value)
        })
    }
    setAllCacheEntries(all)
    // setFilteredCacheEntries(filtered)
    const { httpCacheEntries, nextJSCacheFetchEntries, nextJSCachePageEntries } = groupCachedEntriesByOrigin(filtered)
    return { httpCacheEntries, nextJSCacheFetchEntries, nextJSCachePageEntries }
  }

  function groupCachedEntriesByOrigin (entries) {
    const output = {
      httpCacheEntries: {},
      nextJSCachePageEntries: {},
      nextJSCacheFetchEntries: {}
    }

    entries.forEach((entry) => {
      const newValue = { ...entry }
      if (entry.kind === 'HTTP_CACHE') {
        if (output.httpCacheEntries[entry.origin] === undefined) {
          output.httpCacheEntries[entry.origin] = []
        }
        output.httpCacheEntries[entry.origin].push(newValue)
      } else if (entry.kind === 'NEXT_CACHE_FETCH') {
        if (output.nextJSCacheFetchEntries[entry.origin] === undefined) {
          output.nextJSCacheFetchEntries[entry.origin] = []
        }
        output.nextJSCacheFetchEntries[entry.origin].push(newValue)
      } else if (entry.kind === 'NEXT_CACHE_PAGE') {
        if (output.nextJSCachePageEntries[entry.serviceId] === undefined) {
          output.nextJSCachePageEntries[entry.serviceId] = []
        }
        output.nextJSCachePageEntries[entry.serviceId].push(newValue)
      }
    })
    return output
  }
  function onCacheEntryChecked (entry, clicked) {
    let newValues = []
    if (clicked) {
      // add this entry
      newValues = [...checkedEntries]
      newValues.push(entry)
    } else {
      // remove this entry
      newValues = checkedEntries.filter(e => e.id !== entry.id)
    }
    setCheckedEntries(newValues)
    setCachedEntriesToInvalidate(newValues)
  }

  function renderData () {
    if (allCacheEntries.length === 0) {
      return (
        <div className={styles.noData}>
          <NoDataFound
            title='Caching not available'
            subTitle={<span>There is no caching for this application.</span>}
          />
        </div>
      )
    }

    function toggleExpanded (origin) {
      const newExpanded = { ...expanded }
      newExpanded[origin] = !newExpanded[origin]
      setExpanded(newExpanded)
    }

    const checkedEntriesId = checkedEntries.map((entry) => entry.id)

    return (
      <div className={styles.entries}>
        <div className={`${styles.originList}`}>
          {Object.keys(httpCacheEntries).map((origin) => <OriginLine
            key={origin}
            name={origin}
            kind='HTTP_CACHE'
            entries={httpCacheEntries[origin]}
            onCacheEntryChecked={onCacheEntryChecked}
            onCacheEntrySelected={onCacheEntrySelected}
            hideChart={hideChart}
            onToggleExpand={() => toggleExpanded(origin)}
            expanded={expanded[origin]}
            checkedEntriesId={checkedEntriesId}
                                                         />)}

          {Object.keys(nextJSCacheFetchEntries).map((origin) => <OriginLine
            key={origin}
            name={origin}
            kind='NEXT_CACHE_FETCH'
            entries={nextJSCacheFetchEntries[origin]}
            onCacheEntryChecked={onCacheEntryChecked}
            onCacheEntrySelected={onCacheEntrySelected}
            hideChart={hideChart}
            onToggleExpand={() => toggleExpanded(origin)}
            expanded={expanded[origin]}
            checkedEntriesId={checkedEntriesId}
                                                                />)}

          {Object.keys(nextJSCachePageEntries).map((origin) => <OriginLine
            key={origin}
            name={origin}
            kind='NEXT_CACHE_PAGE'
            entries={nextJSCachePageEntries[origin]}
            onCacheEntryChecked={onCacheEntryChecked}
            onCacheEntrySelected={onCacheEntrySelected}
            hideChart={hideChart}
            onToggleExpand={() => toggleExpanded(origin)}
            expanded={expanded[origin]}
            checkedEntriesId={checkedEntriesId}
                                                               />)}
        </div>
      </div>
    )
  }
  return (
    <div className={styles.container}>
      {allCacheEntries.length > 0 &&
        <div className={styles.header}>
          <div className={styles.appSelector}>
            <Forms.Select
              defaultContainerClassName={styles.select}
              backgroundColor={RICH_BLACK}
              borderColor={WHITE}
              defaultOptionsClassName={`${typographyStyles.desktopButtonSmall} ${styles.optionsClass}`}
              options={cacheTypeFilterOptions}
              onSelect={async (evt) => {
                const type = evt.detail.value
                const selectedType = cacheTypeFilterOptions.find((opt) => opt.value === type)
                setSelectedCacheType(selectedType)
              }}
              optionsBorderedBottom={false}
              mainColor={WHITE}
              borderListColor={WHITE}
              value={selectedCacheType?.label}
              inputTextClassName={`${typographyStyles.desktopButtonSmall} ${typographyStyles.textWhite} ${styles.heightSelectClass}`}
              paddingClass={styles.selectPaddingClass}
              handleClickOutside
              placeholder='Select Cache type...'
            />
          </div>
          <div className={styles.searchBar}>
            <SearchBarV2
              placeholder='Search for key or value'
            /* eslint-disable-next-line */
            onClear={() => { alert('clear')}}
              onChange={handleSearch}
              inputTextClassName={`${typographyStyles.desktopBodySmall} ${typographyStyles.textWhite}`}
              paddingClass={styles.searchBarPaddingClass}
            />
          </div>

          <Button
            type='button'
            label={`Invalidate (${cachedEntriesToInvalidate.length})`}
            onClick={() => invalidate(cachedEntriesToInvalidate)}
            disabled={cachedEntriesToInvalidate.length === 0}
            color={ERROR_RED}
            backgroundColor={TRANSPARENT}
            textClass={typographyStyles.desktopButtonSmall}
            paddingClass={commonStyles.smallButtonPadding}
          />
        </div>}
      {renderData()}
    </div>

  )
}
