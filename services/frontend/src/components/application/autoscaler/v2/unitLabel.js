const unit = (import.meta.env.VITE_AUTOSCALER_UNIT ?? 'pod').toLowerCase()
const cap = unit.charAt(0).toUpperCase() + unit.slice(1)

export const unitSingular = unit
export const unitSingularCap = cap
export const unitPlural = unit + 's'
export const unitPluralCap = cap + 's'
export const unitPluralUpper = (unit + 's').toUpperCase()
