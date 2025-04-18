import styles from './Header.module.css'
import commonStyles from '~/styles/CommonStyles.module.css'
import { HorizontalSeparator } from '@platformatic/ui-components'
import { WHITE, MARGIN_0, OPACITY_15 } from '@platformatic/ui-components/src/components/constants'
import Navigation from '~/layout/Navigation'
import UserData from '~/layout/UserData'
import { useNavigate } from 'react-router-dom'
import { HOME_PATH, PAGE_APPS } from '~/ui-constants'
import useICCStore from '~/useICCStore'
import Logo from '~/components/ui/Logo'

function Header () {
  const navigate = useNavigate()
  const globalState = useICCStore()
  const { setCurrentPage } = globalState

  function goToHome () {
    navigate(HOME_PATH)
    setCurrentPage(PAGE_APPS)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={commonStyles.mediumFlexRow}>
          <div className={commonStyles.cursorPointer} onClick={() => goToHome()}>
            <Logo width={40} height={27.7} />
          </div>

          <Navigation />
        </div>
        <div className={`${commonStyles.smallFlexRow}`}>
          <UserData />
        </div>
      </div>
      <HorizontalSeparator marginBottom={MARGIN_0} marginTop={MARGIN_0} color={WHITE} opacity={OPACITY_15} />
    </div>
  )
}

export default Header
