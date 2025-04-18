// PATHS
export const HOME_PATH = '/'
export const PAGE_OVERVIEW = '/'
export const PAGE_APPS = '/apps'
export const PAGE_DEPLOYMENTS = '/deployments'
export const PAGE_ACTIVITIES = '/activities'
export const PAGE_TAXONOMY = '/taxonomy'
export const NOT_FOUND_PATH = '/notfound'
export const ERROR_PAGE_PATH = '/errorpage'
export const PAGE_PROFILE = '/profile'
export const PAGE_SCHEDULED_JOBS = '/scheduled_jobs'
export const PAGE_SCHEDULED_JOB_DETAIL = '/scheduled_jobs/:id'
export const APPLICATION_PATH = '/:taxonomyId/applications/:appId'
export const POD_DETAIL_PATH = '/:taxonomyId/applications/:appId/'
export const PAGE_SETTINGS = '/settings'
export const PAGE_PREVIEWS = '/previews'
export const PAGE_CACHING = '/caching'
export const PAGE_RECOMMENDATION_HISTORY = '/recommendations-history'
export const PAGE_CONFIGURE_INGRESS_PATHS = '/ingress-paths'
export const PAGE_PREVIEW_DETAIL = '/previews-detail'
export const PREVIEWS_DETAIL_PATH = '/previews/:taxonomyId'
export const PREVIEW_POD_DETAIL_OVERVIEW_PATH = '/previews/:taxonomyId/applications/:appId/:podId'
export const PREVIEW_POD_DETAIL_SERVICES_PATH = PREVIEW_POD_DETAIL_OVERVIEW_PATH + '/services'
export const PREVIEW_POD_DETAIL_LOGS_PATH = PREVIEW_POD_DETAIL_OVERVIEW_PATH + '/logs'

export const TAXONOMY_PATH = PAGE_TAXONOMY
export const PREVIEWS_PATH = PAGE_PREVIEWS
export const ALL_DEPLOYMENTS_PATH = PAGE_DEPLOYMENTS
export const ALL_ACTIVITIES_PATH = PAGE_ACTIVITIES
export const GENERAL_SETTING_PATH = PAGE_SETTINGS
export const CACHING_PATH = PAGE_CACHING
export const CONFIGURE_INGRESS_PATHS_PATH = PAGE_CONFIGURE_INGRESS_PATHS
export const RECOMMENDATIONS_HISTORY_PATH = PAGE_RECOMMENDATION_HISTORY
export const SCHEDULED_JOB_PATH = APPLICATION_PATH + PAGE_SCHEDULED_JOBS
export const SCHEDULED_JOB_DETAIL_PATH = APPLICATION_PATH + PAGE_SCHEDULED_JOB_DETAIL

/** Pages */
// export const PAGE_APPLICATION_DETAILS = '/details'
export const PAGE_APPLICATION_DETAILS = APPLICATION_PATH
export const PAGE_APPLICATION_DETAILS_SERVICES = '/services'
export const PAGE_APPLICATION_DETAILS_DEPLOYMENT_HISTORY = '/deployment-history'
export const PAGE_APPLICATION_DETAIL_AUTOSCALER = '/autoscaler'
export const PAGE_APPLICATION_DETAIL_LOGS = '/logs'
export const PAGE_APPLICATION_DETAIL_SETTINGS = '/app_settings'
export const PAGE_APPLICATION_DETAILS_ACTIVITY = '/activities'
export const PAGE_APPLICATION_DETAILS_SERVICE_DETAIL = '/:serviceId'
export const APPLICATION_DETAIL_PATH = APPLICATION_PATH
export const APPLICATION_DETAIL_SERVICES_PATH = APPLICATION_PATH + PAGE_APPLICATION_DETAILS_SERVICES
export const APPLICATION_DETAIL_SERVICE_DETAIL_PATH = APPLICATION_DETAIL_SERVICES_PATH + PAGE_APPLICATION_DETAILS_SERVICE_DETAIL
export const APPLICATION_DETAIL_DEPLOYMENT_HISTORY_PATH = APPLICATION_PATH + PAGE_APPLICATION_DETAILS_DEPLOYMENT_HISTORY
export const APPLICATION_DETAIL_AUTOSCALER_PATH = APPLICATION_PATH + PAGE_APPLICATION_DETAIL_AUTOSCALER
export const APPLICATION_DETAIL_LOGS_PATH = APPLICATION_PATH + PAGE_APPLICATION_DETAIL_LOGS
export const APPLICATION_DETAIL_SETTINGS_PATH = APPLICATION_PATH + PAGE_APPLICATION_DETAIL_SETTINGS
export const APPLICATION_DETAIL_ACTIVITIES_PATH = APPLICATION_PATH + PAGE_APPLICATION_DETAILS_ACTIVITY

export const AUTOSCALER_POD_DETAIL_PATH = '/:taxonomyId/applications/:appId/autoscaler/:podId'
export const AUTOSCALER_POD_DETAIL_OVERVIEW_PATH = AUTOSCALER_POD_DETAIL_PATH
export const AUTOSCALER_POD_DETAIL_SERVICES_PATH = AUTOSCALER_POD_DETAIL_PATH + '/services'
export const AUTOSCALER_POD_DETAIL_LOGS_PATH = AUTOSCALER_POD_DETAIL_PATH + '/logs'

export const MAX_WIDTH_LG = 1240
export const MAX_WIDTH_MD = 744

export const TEMPLATE = 'template'
export const PLUGIN = 'plugin'

export const FILTER_TEMPLATES = 'templates'
export const FILTER_PLUGINS = 'plugins'
export const FILTER_ALL = 'all'

export const FEATURE_FLAGS_NAMESPACE = 'https://platformatic.cloud'

export const STATUS_NOT_STARTED = 'not_started'
export const STATUS_RUNNING = 'running'
export const STATUS_STARTED = 'started'
export const STATUS_COMPLETED = 'completed'
export const STATUS_ERROR = 'error'
export const STATUS_STOPPED = 'stopped'

export const STATUS_PUBLISHED = 'public'
export const STATUS_REJECTED = 'rejected'
export const STATUS_PENDING_APPROVAL = 'public_request'
export const STATUS_READY = 'ready'

export const PUBLISH_STATE_FORM = 'form'
export const PUBLISH_STATE_SUMMARY = 'summary'
export const PUBLISH_STATE_ERROR = 'error'
export const ASC = 'asc'
export const DESC = 'desc'

export const KEY_PROFILE = 'profile'
export const KEY_ORGANIZATIONS = 'organizations'
export const KEY_ORGANIZATION = 'organization'

// eslint-disable-next-line no-control-regex
export const EMAIL_PATTERN = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

export const SERVICE_OUTDATED = 'outdated'

export const STATUS_OPEN = 'open'
export const STATUS_CLOSED = 'closed'

export const UP = 'up'
export const DOWN = 'down'
export const STALE = 'stale'

export const SMALL_REQUEST_AMOUNT = 'small'
export const MEDIUM_REQUEST_AMOUNT = 'medium'
export const HIGH_REQUEST_AMOUNT = 'high'
export const NO_REQUESTS_AMOUNT = 'no_request'

export const SLOW_RESPONSE_TIME = 'slow'
export const MEDIUM_RESPONSE_TIME = 'medium'
export const FAST_RESPONSE_TIME = 'fast'
export const NO_REQUEST_TIME = 'no_request'

export const TAXONOMY_NOT_FOUND_GENERATION = 'notfound'

export const RAW = 'raw'
export const PRETTY = 'pretty'

export const DIRECTION_DOWN = 'down'
export const DIRECTION_STILL = 'still'
export const DIRECTION_UP = 'up'
export const DIRECTION_TAIL = 'tail'

export const STATUS_PAUSED_LOGS = 'PAUSED'
export const STATUS_RESUMED_LOGS = 'RESUMED'

export const STATUS_UNCHANGED = 'unchanged'
export const STATUS_REMOVED = 'removed'
export const STATUS_ADDED = 'added'
export const STATUS_EDITED = 'edited'

export const RADIX_INGRESS_CONTROLLER = 'ingress-controller'

export const LOW_PERFORMANCE = 'low'
export const GOOD_PERFORMANCE = 'good'
export const GREAT_PERFORMANCE = 'great'
export const UNKNOWN_PERFORMANCE = 'unknown'

export const REFRESH_INTERVAL = 30000
export const REFRESH_INTERVAL_METRICS = 2000

export const REFRESH_INTERVAL_APPLICATIONS = import.meta.env?.VITE_APPLICATIONS_REFRESH_INTERVAL || 3000

export const ROLE_SUPER_ADMIN = 'super-admin'
export const ROLE_USER = 'user'
export const ROLE_ADMIN = 'admin'

export const K8S_KEY_CPU = 'cpu'
export const K8S_KEY_MEMORY = 'memory'
export const K8S_KEY_REQUESTS = 'requests'
export const K8S_KEY_ELU = 'elu'

export const POSITION_ABSOLUTE = 'absolute'
export const POSITION_FIXED = 'fixed'

export const MIN_HEIGHT_COMPACT_SIZE = 770
export const DEFAULT_HEIGHT_CHART = 96
