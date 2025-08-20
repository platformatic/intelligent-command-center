import assert from 'node:assert'

import type { BudgetSet } from './budget-set'
import type { CostSet } from './cluster'
import {
  BudgetMustBePositiveError,
  BudgetMaxLessThanMinError
} from './error'

export interface BudgetInput {
  min: number,
  max: number
}

export class Budget {
  min: number
  max: number
  used: number

  constructor (min: number, max: number, used: number) {
    this.min = min
    this.max = max
    this.used = used

    Object.freeze(this)

    assert(min <= max, new BudgetMaxLessThanMinError(this))
    assert(min >= 0, new BudgetMustBePositiveError('min', this))
    assert(used >= 0, new BudgetMustBePositiveError('used', this))

    // Going over-budget is explicitly allowed.
    // assert(used <= max)
  }

  static from ({ min, max }: BudgetInput) {
    return new Budget(min, max, 0)
  }

  get allocated (): number {
    return Math.max(this.min, this.used)
  }

  get available (): number {
    return this.max - this.used
  }

  get isOverBudget (): boolean {
    return this.used > this.max
  }

  toJSON () {
    return {
      min: this.min,
      max: this.max,
      used: this.used,
      allocated: this.allocated,
      available: this.available
    }
  }

  isOverTotal (amount: number): boolean {
    return amount > this.max
  }

  isOverAvailable (amount: number): boolean {
    return this.available < amount
  }

  // Create a copy of this budget with zero allocations in it
  empty (): Budget {
    return new Budget(this.min, this.max, 0)
  }

  alloc (amount: number): Budget {
    return new Budget(this.min, this.max, this.used + amount)
  }

  reclaim (amount: number): Budget {
    return new Budget(this.min, this.max, this.used - amount)
  }

  hasRoom (amount: number): boolean {
    return this.available >= amount
  }
}
