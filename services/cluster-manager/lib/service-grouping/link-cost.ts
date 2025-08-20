export interface LinkCostInput {
  count: number
  average: number
}

export class LinkCost {
  count: number
  average: number

  constructor (count: number, average: number) {
    this.count = count
    this.average = average
  }

  static from (input: LinkCostInput): LinkCost {
    return new LinkCost(input.count, input.average)
  }

  get cost (): number {
    return this.count * this.average
  }

  add (other: LinkCost): LinkCost {
    if (this.count === 0) return other
    const count = this.count + other.count
    return new LinkCost(count, (this.cost + other.cost) / count)
  }
}
