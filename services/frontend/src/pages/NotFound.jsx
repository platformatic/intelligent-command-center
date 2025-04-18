import React from 'react'
import styles from './Errors.module.css'
import { Layout } from '@platformatic/ui-components'
import commonStyles from '~/styles/CommonStyles.module.css'
import Logo from '~/components/ui/Logo'

function NotFound () {
  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.title}>
          <Logo width={100} heigth={80} />
          <a href='https://platformatic.dev' className={styles.linkToPlatformaticDev} target='_blank' rel='noreferrer'>PLATFORMATIC</a>
        </div>
        <p className={styles.code}>404</p>
        <p className={styles.subtitle}>Oops! Page not found</p>
        <p className={styles.details}>
          The page that you are looking for is not available at the moment!
          <br />
          <br />
          Try checking the URL, or go back to our <a href='/' className={commonStyles.applyHoverUnderline}>homepage</a>.
        </p>
      </div>
    </Layout>
  )
}

export default NotFound
