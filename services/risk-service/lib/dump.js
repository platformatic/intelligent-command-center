'use strict'

async function dumpPaths (coldStorage, store) {
  const { parsePath, getDump } = store
  const dump = await getDump()

  // Dump all the paths
  // We also need to save the keys so we can delete them later, if the save on postgres succeeds
  const dumps = []
  const keys = []

  for (const path of Object.keys(dump)) {
    dumps.push(parsePath(path, dump[path]))
    keys.push(path)
  }

  await coldStorage.postPathsDump({ dump: dumps })
  // istanbul ignore else
  if (keys.length > 0) {
    await store.deleteKeys(keys)
  }
}

async function dumpDBOperations (coldStorage, store) {
  const { getDBOperationsDump } = store
  const dump = await getDBOperationsDump()

  const dumpPayload = []
  const keysToBeDeletedFromRedis = []

  for (const { id, ops } of dump) {
    for (const op of ops) {
      dumpPayload.push({
        dbId: id,
        ...op
      })
    }
    keysToBeDeletedFromRedis.push(id)
  }

  if (dumpPayload.length === 0) {
    return
  }
  await coldStorage.postDbDump({ dump: dumpPayload })
  await store.deleteKeys(keysToBeDeletedFromRedis)
}

async function dumpLatencies (coldStorage, store) {
  const { getLatenciesDump } = store
  const dump = await getLatenciesDump()

  const keysToBeDeletedFromRedis = []
  for (const d of dump) {
    keysToBeDeletedFromRedis.push(d.id)
    delete d.id
  }
  if (dump.length === 0) {
    return
  }
  await coldStorage.postLatenciesDump({ dump })
  await store.deleteKeys(keysToBeDeletedFromRedis)
}

module.exports = {
  dumpPaths,
  dumpDBOperations,
  dumpLatencies
}
