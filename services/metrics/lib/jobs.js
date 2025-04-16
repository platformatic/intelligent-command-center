'use strict'
const {
  queryPrometheus
} = require('./prom')

const createJobsMessagesSentQuery = (appId) =>
  `icc_jobs_messages_sent{applicationId="${appId}"}`
const createJobsMessagesFailedQuery = (appId) =>
  `icc_jobs_messages_failed{applicationId="${appId}"}`
const createJobsMessagesRetriesQuery = (appId) =>
  `icc_jobs_messages_retries{applicationId="${appId}"}`
const createAverageExecutionTimeQuery = (appId) =>
  `icc_jobs_messages_execution_time_sum{applicationId="${appId}"} / icc_jobs_messages_sent{applicationId="${appId}"}`

const createJobMessagesSentQuery = (jobId) => `icc_jobs_messages_sent{jobId="${jobId}"}`
const createJobMessagesFailedQuery = (jobId) => `icc_jobs_messages_failed{jobId="${jobId}"}`
const createJobMessagesRetriesQuery = (jobId) => `icc_jobs_messages_retries{jobId="${jobId}"}`
const createJobAverageExecutionTimeQuery = (jobId) => `icc_jobs_messages_execution_time_sum{jobId="${jobId}"} / icc_jobs_messages_sent{jobId="${jobId}"}`

const getJobsMetrics = async (appId) => {
  const messagesSentQuery = createJobsMessagesSentQuery(appId)
  const messagesFailedQuery = createJobsMessagesFailedQuery(appId)
  const messagesRetriesQuery = createJobsMessagesRetriesQuery(appId)
  const averageExecutionTimeQuery = createAverageExecutionTimeQuery(appId)

  const [messagesSentRes, messagesFailedRes, messagesRetriesRes, averageExecutionTimeRes] = await Promise.all([
    queryPrometheus(messagesSentQuery),
    queryPrometheus(messagesFailedQuery),
    queryPrometheus(messagesRetriesQuery),
    queryPrometheus(averageExecutionTimeQuery)
  ])

  const averageExecutionTime = parseFloat(averageExecutionTimeRes?.data?.result[0]?.value[1]) || 0
  const sentMessages = parseFloat(messagesSentRes?.data?.result[0]?.value[1]) || 0
  const failures = parseFloat(messagesFailedRes?.data?.result[0]?.value[1]) || 0
  const totalRetries = parseFloat(messagesRetriesRes?.data?.result[0]?.value[1]) || 0
  const successes = sentMessages - failures
  const res = {
    averageExecutionTime,
    successes,
    failures,
    sentMessages,
    totalRetries
  }
  return res
}

const getJobMetrics = async (jobId) => {
  const messagesSentQuery = createJobMessagesSentQuery(jobId)
  const messagesFailedQuery = createJobMessagesFailedQuery(jobId)
  const messagesRetriesQuery = createJobMessagesRetriesQuery(jobId)
  const averageExecutionTimeQuery = createJobAverageExecutionTimeQuery(jobId)

  const [messagesSentRes, messagesFailedRes, messagesRetriesRes, averageExecutionTimeRes] = await Promise.all([
    queryPrometheus(messagesSentQuery),
    queryPrometheus(messagesFailedQuery),
    queryPrometheus(messagesRetriesQuery),
    queryPrometheus(averageExecutionTimeQuery)
  ])

  const averageExecutionTime = parseFloat(averageExecutionTimeRes?.data?.result[0]?.value[1]) || 0
  const sentMessages = parseFloat(messagesSentRes?.data?.result[0]?.value[1]) || 0
  const failures = parseFloat(messagesFailedRes?.data?.result[0]?.value[1]) || 0
  const totalRetries = parseFloat(messagesRetriesRes?.data?.result[0]?.value[1]) || 0
  const successes = sentMessages - failures
  const res = {
    averageExecutionTime,
    successes,
    failures,
    sentMessages,
    totalRetries
  }
  return res
}

module.exports = {
  getJobsMetrics,
  getJobMetrics
}
