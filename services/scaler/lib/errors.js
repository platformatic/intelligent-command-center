'use strict'

const createError = require('@fastify/error')

const ERROR_PREFIX = 'PLT_SCALER'

module.exports = {
  SCALER_GENERIC_ERROR: createError(
    `${ERROR_PREFIX}_ERROR`, 'ERROR"'
  ),
  ALERT_PARSING_ERROR: createError(
    `${ERROR_PREFIX}_ALERT_PARSING_ERROR`, 'Failed to parse alert data: %s'
  ),
  FAILED_TO_GET_POD_CONTROLLER: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_POD_CONTROLLER`, 'Failed to get pod controller: %s'
  ),
  FAILED_TO_UPDATE_CONTROLLER: createError(
    `${ERROR_PREFIX}_FAILED_TO_UPDATE_CONTROLLER`, 'Failed to update controller: %s'
  ),
  SCALE_REQUEST_SUPERSEDED: createError(
    `${ERROR_PREFIX}_SCALE_REQUEST_SUPERSEDED`, 'Scale request superseded by a newer request for controller "%s" in namespace "%s"'
  ),
  FAILED_TO_GET_CONTROLLER: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_CONTROLLER`, 'Failed to get controller: %s'
  ),
  APPLICATION_CONTROLLER_NOT_FOUND: createError(
    `${ERROR_PREFIX}_APPLICATION_CONTROLLER_NOT_FOUND`, 'Application controller not found for "%s" application'
  ),
  FAILED_TO_GET_CONTROLLERS: createError(
    `${ERROR_PREFIX}_FAILED_TO_GET_CONTROLLERS`, 'Failed to get controllers: %s'
  ),
  INSTANCE_NOT_FOUND: createError(
    `${ERROR_PREFIX}_INSTANCE_NOT_FOUND`, 'Instance not found for pod "%s"'
  ),
  ALERT_NOT_FOUND: createError(
    `${ERROR_PREFIX}_ALERT_NOT_FOUND`, 'Alert not found: "%s"', 404
  ),
  FLAMEGRAPH_NOT_FOUND: createError(
    `${ERROR_PREFIX}_FLAMEGRAPH_NOT_FOUND`, 'Flamegraph not found: "%s"', 404
  ),
  SCHEDULE_INVALID_RRULE: createError(
    `${ERROR_PREFIX}_SCHEDULE_INVALID_RRULE`, 'Invalid schedule RRULE: %s', 400
  ),
  SCHEDULE_INVALID_LIMITS: createError(
    `${ERROR_PREFIX}_SCHEDULE_INVALID_LIMITS`, 'Invalid schedule limits: %s', 400
  ),
  SCHEDULE_INVALID_TIMEZONE: createError(
    `${ERROR_PREFIX}_SCHEDULE_INVALID_TIMEZONE`, 'Invalid schedule timezone: %s', 400
  ),
  SCHEDULE_INVALID_TICK_INTERVAL: createError(
    `${ERROR_PREFIX}_SCHEDULE_INVALID_TICK_INTERVAL`,
    'PLT_SCALER_SCHEDULER_TICK_MINUTES must be an integer that divides 60 evenly (1,2,3,4,5,6,10,12,15,20,30,60); got %s'
  ),
  SCHEDULE_NOT_FOUND: createError(
    `${ERROR_PREFIX}_SCHEDULE_NOT_FOUND`, 'Schedule not found: "%s"', 404
  ),
  SUGGESTION_NOT_FOUND: createError(
    `${ERROR_PREFIX}_SUGGESTION_NOT_FOUND`, 'Suggestion not found: "%s"', 404
  ),
  SUGGESTION_ALREADY_ACCEPTED: createError(
    `${ERROR_PREFIX}_SUGGESTION_ALREADY_ACCEPTED`, 'Suggestion already accepted: "%s"', 409
  ),
  INVALID_TIME_SLOT: createError(
    `${ERROR_PREFIX}_INVALID_TIME_SLOT`,
    'PLT_SCALER_TIME_SLOT_MINUTES must be an integer that divides 60 evenly (1,2,3,4,5,6,10,12,15,20,30,60); got %s'
  ),
  INVALID_TIME_SLOT_TIMEZONE: createError(
    `${ERROR_PREFIX}_INVALID_TIME_SLOT_TIMEZONE`, 'Invalid time slot timezone: %s'
  ),
  INVALID_TIME_WINDOW: createError(
    `${ERROR_PREFIX}_INVALID_TIME_WINDOW`,
    'PLT_SCALER_TIME_WINDOW_MINUTES must be an integer > PLT_SCALER_TIME_SLOT_MINUTES, a multiple of it, and a divisor of 1440; got %s'
  )
}
