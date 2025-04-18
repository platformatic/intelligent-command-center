import React from 'react'
import { Layout } from '@platformatic/ui-components'
import styles from './Errors.module.css'
import Logo from '~/components/ui/Logo'

function ErrorPage () {
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.title}>
          <Logo width={100} heigth={80} />
          <a href='https://platformatic.dev' className={styles.linkToPlatformaticDev} target='_blank' rel='noreferrer'>PLATFORMATIC</a>
        </div>
        <p className={styles.code}>500</p>
        <p className={styles.subtitle}>We are having issues, please came back later</p>
      </div>
    </Layout>
  )
}

export default ErrorPage
