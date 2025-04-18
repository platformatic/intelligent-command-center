import { ERROR_RED, WHITE } from '@platformatic/ui-components/src/components/constants'

export function getAfterIcon (fieldValue, validationValue) {
  if (fieldValue) {
    return validationValue ? { iconName: 'AlertIcon', color: ERROR_RED } : { iconName: 'CircleCheckMarkIcon', color: WHITE }
  }
  return null
}

export function getAfterIconOnEdit (fieldValue, validationValue, originalValue) {
  if (fieldValue === originalValue) {
    return { iconName: 'EditIcon', color: WHITE }
  }
  return validationValue ? { iconName: 'AlertIcon', color: ERROR_RED } : { iconName: 'CircleCheckMarkIcon', color: WHITE }
}

export function getAfterIconSendEmail (validationValue, callback) {
  return validationValue ? { iconName: 'AlertIcon', color: ERROR_RED, handleClick: () => null } : { iconName: 'SendIcon', color: WHITE, handleClick: callback }
}
