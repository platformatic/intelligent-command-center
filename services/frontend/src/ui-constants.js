// PATHS
export const HOME_PATH = '/'

export const KEY_PROFILE = 'profile'

export const UP = 'up'
export const DOWN = 'down'
export const STALE = 'stale'

export const LOW_PERFORMANCE = 'low'
export const GOOD_PERFORMANCE = 'good'
export const GREAT_PERFORMANCE = 'great'
export const UNKNOWN_PERFORMANCE = 'unknown'

export const REFRESH_INTERVAL = 30000
export const REFRESH_INTERVAL_METRICS = 2000
export const REFRESH_INTERVAL_APPLICATIONS = import.meta.env?.VITE_APPLICATIONS_REFRESH_INTERVAL || 3000

export const K8S_KEY_CPU = 'cpu'
export const K8S_KEY_MEMORY = 'memory'
export const K8S_KEY_REQUESTS = 'requests'
export const K8S_KEY_ELU = 'elu'

export const ROLE_SUPER_ADMIN = 'super-admin'
export const ROLE_USER = 'user'
export const ROLE_ADMIN = 'admin'

// eslint-disable-next-line no-control-regex
export const EMAIL_PATTERN = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

export const FILTER_TEMPLATES = 'templates'
export const FILTER_PLUGINS = 'plugins'
export const FILTER_ALL = 'all'

export const STATUS_RUNNING = 'running'
export const STATUS_STARTED = 'started'
export const STATUS_STOPPED = 'stopped'

export const POSITION_ABSOLUTE = 'absolute'
export const POSITION_FIXED = 'fixed'

export const SMALL_REQUEST_AMOUNT = 'small'
export const MEDIUM_REQUEST_AMOUNT = 'medium'
export const HIGH_REQUEST_AMOUNT = 'high'
export const NO_REQUESTS_AMOUNT = 'no_request'
export const SLOW_RESPONSE_TIME = 'slow'
export const MEDIUM_RESPONSE_TIME = 'medium'
export const FAST_RESPONSE_TIME = 'fast'
export const NO_REQUEST_TIME = 'no_request'
export const RADIX_INGRESS_CONTROLLER = 'ingress-controller'

export const TAXONOMY_NOT_FOUND_GENERATION = 'notfound'

export const SERVICE_OUTDATED = 'outdated'

export const MIN_HEIGHT_COMPACT_SIZE = 770
export const DEFAULT_HEIGHT_CHART = 96
