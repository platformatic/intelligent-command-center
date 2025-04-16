'use strict'

// We could converto to GiB too, but Prometheus uses GB, so we keep it consistent
module.exports.toGB = (bytes) => bytes / Math.pow(10, 9)
