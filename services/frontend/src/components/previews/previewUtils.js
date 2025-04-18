export const ANY_RISK = preview => preview.risk >= 0 || preview.risk === undefined

export const LOW_RISK = preview => preview.risk < 25

export const MEDIUM_RISK = preview => preview.risk >= 25 && preview.risk < 60

export const HIGH_RISK = preview => preview.risk > 60
