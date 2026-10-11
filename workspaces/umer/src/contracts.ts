export const leadStatuses = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'DISQUALIFIED',
] as const;
export const opportunityStages = [
  'QUALIFICATION',
  'NEEDS_ANALYSIS',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;
export type LeadStatus = (typeof leadStatuses)[number];
export type OpportunityStage = (typeof opportunityStages)[number];
export interface CompanyRequest {
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
}
export interface ContactRequest {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  status: string | null;
}
export interface LeadRequest {
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
}
export interface OpportunityRequest {
  name: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  stage?: OpportunityStage;
  expectedCloseDate: string | null;
  companyId: string;
  contactId: string | null;
}
interface Metadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}
export interface Company extends CompanyRequest, Metadata {
  status: string;
}
export interface Contact extends ContactRequest, Metadata {
  status: string;
}
export interface Lead extends LeadRequest, Metadata {
  status: LeadStatus;
}
export interface Opportunity extends OpportunityRequest, Metadata {
  stage: OpportunityStage;
}
export interface Resources {
  companies: Company;
  contacts: Contact;
  leads: Lead;
  opportunities: Opportunity;
}
export interface Requests {
  companies: CompanyRequest;
  contacts: ContactRequest;
  leads: LeadRequest;
  opportunities: OpportunityRequest;
}
export type Resource = keyof Resources;
export type RecordDto = Resources[Resource];
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
export const leadTransitions: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['CONTACTED', 'QUALIFIED', 'DISQUALIFIED'],
  CONTACTED: ['QUALIFIED', 'DISQUALIFIED'],
  QUALIFIED: [],
  DISQUALIFIED: [],
};
export const stageTransitions: Record<
  OpportunityStage,
  readonly OpportunityStage[]
> = {
  QUALIFICATION: ['NEEDS_ANALYSIS', 'CLOSED_LOST'],
  NEEDS_ANALYSIS: ['PROPOSAL', 'CLOSED_LOST'],
  PROPOSAL: ['NEGOTIATION', 'CLOSED_LOST'],
  NEGOTIATION: ['CLOSED_WON', 'CLOSED_LOST'],
  CLOSED_WON: [],
  CLOSED_LOST: [],
};
