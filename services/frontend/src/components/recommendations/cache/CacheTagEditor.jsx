import React, { useEffect, useState, useRef } from 'react'
import { MEDIUM, WHITE, RICH_BLACK } from '@platformatic/ui-components/src/components/constants'
import Icons from '@platformatic/ui-components/src/components/icons'
import { Button, Forms } from '@platformatic/ui-components'

import commonStyles from '~/styles/CommonStyles.module.css'
import styles from './CacheTagEditor.module.css'
import { query } from 'fgh'
import { callApiGetCacheRouteExample } from '../../../api/cache-recommendations'

export default function CacheTagEditor ({ route, onTagUpdate }) {
  const [routeData, setRouteData] = useState({})
  const [queryParameters, setQueryParameters] = useState({})
  const [headerParameters, setHeaderParameters] = useState({})
  const [pathParameters, setPathParameters] = useState({})

  const [cacheTags, setCacheTags] = useState('')
  const [cacheTagPreview, setCacheTagPreview] = useState('')
  const [error, setError] = useState('')
  const [routeExample, setRouteExample] = useState(null)
  const textAreaRef = useRef(null)
  async function fetchRouteExample () {
    const res = await callApiGetCacheRouteExample(route.applicationId, route.route)
    setRouteExample(res)
  }

  useEffect(() => {
    fetchRouteExample()
  }, [])
  useEffect(() => {
    try {
      if (cacheTags.length === 0) {
        setError('')
        setCacheTagPreview('')
        return
      }
      const tokens = cacheTags.split(',').map((token) => token.trim())
      const output = tokens.map((token) => {
        const obj = query(token, routeData)
        if (obj.length === 0) {
          return ''
        }
        return obj.join(' ')
      })
      // set error if output matches the string [object Object]
      if (output.includes('[object Object]')) {
        throw new Error('[object Object] in the output.')
      }
      setCacheTagPreview(output.filter((item) => item !== '').join(', '))
      setError('')
    } catch (error) {
      console.error(error)
      setError('There syntax is incorrect. Please fix it to preview.')
    }
  }, [cacheTags])

  useEffect(() => {
    if (routeExample) {
      setHeaderParameters(routeExample.request.headers)
      setPathParameters(routeExample.request.params)
      setQueryParameters(routeExample.request.querystring)
      const routeDataToSet = {
        headers: routeExample.request.headers,
        params: routeExample.request.params,
        querystring: routeExample.request.querystring
      }
      setRouteData(routeDataToSet)
    }
  }, [routeExample])
  useEffect(() => {
    setCacheTags(route.cacheTag)
  }, [])

  useEffect(() => {

  }, [queryParameters, headerParameters, pathParameters])

  useEffect(() => {
    onTagUpdate(cacheTags)
  }, [cacheTags])

  function handleCacheTagsTextAreaChange (e) {
    setCacheTags(e.target.value)
  }
  function handleAddParameter (parameter) {
    // get the current cursor position of the textarea
    const cursorPosition = textAreaRef.current.selectionStart
    const newCacheTags = cacheTags.slice(0, cursorPosition) + parameter + cacheTags.slice(cursorPosition)
    setCacheTags(newCacheTags)
  }
  function handleRemoveParameter (parameter) {
    // remove all occurrences of the parameter from the textarea
    const newCacheTags = cacheTags.replaceAll(parameter, '')
    setCacheTags(newCacheTags)
  }

  function ParameterSection ({ title, parameters, prefix, onAdd, onRemove }) {
    return (
      <div className={styles.parameterSection}>
        <div className={styles.parameterSectionTitle}>{title}</div>
        <div className={styles.parametersContainer}>
          {Object.entries(parameters).map(([key, value]) => (
            <ParameterButton
              key={key}
              name={key}
              value={value}
              selected
              onAdd={() => {
                // always add the key in double quotes and square brackets
                onAdd(`.${prefix}["${key}"]`)
              }}
              onRemove={() => {
                onRemove(`.${prefix}["${key}"]`)
              }}
            />
          ))}
          <AddParameterButton onAdd={(parameter) => {
            const newRouteData = { ...routeData }
            const [key, value] = parameter.split(':')
            newRouteData[prefix][key] = value
            setRouteData(newRouteData)
            onAdd(`.${prefix}["${key}"]`)
          }}
          />
        </div>

      </div>
    )
  }
  return (
    <div className={styles.container}>

      <div className={styles.column}>
        <div className={styles.title}>Example Data</div>
        <span className={styles.secondaryText}>Select one of the example data below or create your own to compose and test the Cache Tags.</span>
        <ParameterSection
          title='Path Parameters'
          parameters={pathParameters}
          prefix='params' onAdd={handleAddParameter}
          onRemove={handleRemoveParameter}
        />
        <ParameterSection
          title='Query Parameters'
          parameters={queryParameters}
          prefix='querystring'
          onAdd={handleAddParameter}
          onRemove={handleRemoveParameter}
        />
        <ParameterSection
          title='Request Headers'
          parameters={headerParameters}
          prefix='headers'
          onAdd={handleAddParameter}
          onRemove={handleRemoveParameter}
        />
      </div>

      <div className={styles.column}>
        <div className={styles.title}>Edit Cache Tags</div>
        <span className={styles.secondaryText}>

          <p>The <span className={styles.terminal}>x-cache-tags</span> header is generated using an <a href='https://github.com/platformatic/fgh' target='_blank' rel='noopener noreferrer'>fgh</a> expression, which is a subset of the powerful <a href='https://jqlang.org/' target='_blank' rel='noopener noreferrer'>jq</a> language.</p>

          <p>The input data is an object containing the following propertis:</p>
          <ul>
            <li><span className={styles.terminal}>headers</span>: an object containing all request headers as keys</li>
            <li><span className={styles.terminal}>path</span>: a string containing the path of the request</li>
            <li><span className={styles.terminal}>querystring</span>: an object containing the parsed querystring</li>
            <li><span className={styles.terminal}>params</span>: an object containing all the path params, e.g. `/:id` will have an `id` param.</li>
            <li><span className={styles.terminal}>response</span>: an object containing the following properties about the response from the upstream server:</li>
            <li><span className={styles.terminal}>headers</span>: the response headers</li>
            <li><span className={styles.terminal}>body</span>: the response body, parsed as JSON.</li>
          </ul>

        </span>
        <div className={styles.cacheTagsContainer}>
          <textarea
            ref={textAreaRef}
            className={styles.textArea}
            cols='auto'
            rows={5}
            placeholder='Enter the Cache Tags'
            value={cacheTags}
            onChange={handleCacheTagsTextAreaChange}
          />
          {error && <span className={styles.error}>{error}</span>}
          <Button
            label='Clear'
            color={WHITE}
            backgroundColor={RICH_BLACK}
            borderColor={WHITE}
            onClick={() => {
              setCacheTags('')
              setCacheTagPreview('')
            }}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Preview</div>
          <div className={styles.cacheTagPreview}>
            <pre>{cacheTagPreview}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function ParameterButton ({ name, value, selected, onAdd, onRemove }) {
  function handleRemove (e) {
    e.stopPropagation()
    e.preventDefault()
    onRemove()
  }
  return (
    <span className={styles.parameterButton} onClick={onAdd}>
      <span>{name}:{value}</span>
      {selected && (
        <span onClick={handleRemove}>
          <Icons.TrashIcon size={MEDIUM} color={WHITE} />
        </span>
      )}
    </span>
  )
}

function AddParameterButton ({ onAdd }) {
  const [showInput, setShowInput] = useState(false)
  const [parameter, setParameter] = useState('')

  function handleSubmit (e) {
    e.preventDefault()
    if (/^[a-zA-Z0-9-]+:[a-zA-Z0-9-]+$/.test(parameter)) {
      onAdd(parameter)
      setParameter('')
      setShowInput(false)
    }
  }
  return (
    <>
      {!showInput && (
        <span className={styles.plusIconButton} onClick={() => setShowInput(true)}>
          <Icons.CircleAddIcon size={MEDIUM} color={WHITE} />
        </span>
      )}
      {showInput && (
        <span className={styles.newParameterInput}>
          <form onSubmit={handleSubmit}>
            <Forms.Input
              placeholder='Enter a parameter name'
              paddingClass={commonStyles.smallButtonPadding}
              onChange={(e) => setParameter(e.target.value)}
              borderColor={WHITE}
              value={parameter}
              backgroundColor={RICH_BLACK}
            />
          </form>
        </span>

      )}
    </>
  )
}
