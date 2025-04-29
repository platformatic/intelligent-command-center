import { Metadatum } from './Metadatum'
import { Report } from './Report'
import { Rule } from './Rule'
import { RuleConfig } from './RuleConfig'
  
interface EntityTypes  {
  Metadatum: Metadatum
    Report: Report
    Rule: Rule
    RuleConfig: RuleConfig
}
  
export { EntityTypes, Metadatum, Report, Rule, RuleConfig }