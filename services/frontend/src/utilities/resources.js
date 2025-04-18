export function getTresholdValuesForResource (s) {
  const map = {
    cores: 10,
    threads: 10,
    heap: 1500,
    memory: 1500
  }
  return map[s]
}

export function getTooltipTextForResource (s) {
  const map = {
    cores: 'Allocating this cores amount may exceed system resources, causing the application to fail to load.',
    threads: 'Allocating this threads amount may exceed system resources, causing the application to fail to load.',
    heap: 'Allocating this heap amount may exceed system resources, causing the application to fail to load.',
    memory: 'Allocating this memory amount may exceed system resources, causing the application to fail to load.'
  }
  return map[s]
}

export function getMaxValuesForResource (s) {
  const map = {
    cores: 16,
    threads: 16,
    heap: 2048,
    memory: 2048
  }
  return map[s]
}
