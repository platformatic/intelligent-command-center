const unit = (import.meta.env.VITE_AUTOSCALER_UNIT ?? 'pod').toLowerCase()

export const unitSingular = unit
export const unitPlural = unit + 's'
export const unitPluralCap = unit.charAt(0).toUpperCase() + unit.slice(1) + 's'
export const unitPluralUpper = (unit + 's').toUpperCase()
