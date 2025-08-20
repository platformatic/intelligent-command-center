import type { BudgetInput } from './budget'
import type { CostSet } from './cluster'

import { Budget } from './budget'

export interface BudgetSetInput {
  [name: string]: BudgetInput
}

export class BudgetSet {
  budgets: Map<string, Budget>

  constructor (budgets: Iterable<readonly [string, Budget]>) {
    this.budgets = new Map(budgets)
  }

  static from (input: BudgetSetInput): BudgetSet {
    return new BudgetSet(
      Object.entries(input)
        .map(([k, v]) => [k, Budget.from(v)])
    )
  }

  get budgetEntries (): [string, Budget][] {
    return Array.from(this.budgets.entries())
  }

  get isOverBudget (): boolean {
    return Array.from(this.budgets.values())
      .some(budget => budget.isOverBudget)
  }

  toJSON () {
    return Object.fromEntries(
      this.budgetEntries
        .map(([k, v]) => [k, v.toJSON()])
    )
  }

  get (name: string): Budget {
    return this.budgets.get(name)
  }

  isOverTotal (costs: CostSet): boolean {
    return this.budgetEntries
      .some(([name, budget]) => budget.isOverTotal(costs[name]))
  }

  hasRoom (costs: CostSet): boolean {
    return this.budgetEntries
      .every(([name, budget]) => budget.hasRoom(costs[name]))
  }

  alloc (costs: CostSet): BudgetSet {
    const budgets = mapEntryValue(this.budgetEntries, (budget, name) => {
      return budget.alloc(costs[name])
    })
    return new BudgetSet(budgets)
  }

  reclaim (costs: CostSet): BudgetSet {
    const budgets = mapEntryValue(this.budgetEntries, (budget, name) => {
      return budget.reclaim(costs[name])
    })
    return new BudgetSet(budgets)
  }

  // Create a copy of this budget with zero allocations in it
  empty (): BudgetSet {
    const budgets = mapEntryValue(this.budgetEntries, budget => budget.empty())
    return new BudgetSet(budgets)
  }
}

function mapEntryValue<K, V, V2> (
  entries: [K, V][],
  fn: (v: V, k: K) => V2
): [K, V2][] {
  return entries.map(([k, v]) => [k, fn(v, k)])
}
