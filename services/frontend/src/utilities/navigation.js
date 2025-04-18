import { PAGE_SCHEDULED_JOBS, PAGE_SCHEDULED_JOB_DETAIL } from '~/ui-constants'
import { APPLICATION_PATH, PAGE_APPS } from '../ui-constants'
import useICCStore from '~/useICCStore'

export function getNavigationBreadcrumbs (page) {
  const { applicationSelected } = useICCStore()
  switch (page) {
    case PAGE_SCHEDULED_JOB_DETAIL:
      return [
        { label: 'Scheduled Jobs', page: PAGE_SCHEDULED_JOBS },
        { label: 'Job Details', page: PAGE_SCHEDULED_JOB_DETAIL }
      ]
    case PAGE_SCHEDULED_JOBS:
      return [
        { label: 'Applications', page: PAGE_APPS },
        { label: applicationSelected?.name, page: APPLICATION_PATH },
        { label: 'Scheduled Jobs', page: PAGE_SCHEDULED_JOBS }
      ]
  }
}
