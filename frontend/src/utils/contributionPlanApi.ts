import axios from 'axios';
import { ContributionFrequency } from './tripHome';

export function saveContributionPlan(
  accountId: string,
  frequency: ContributionFrequency,
  options?: { agreed?: boolean }
) {
  return axios.put(`/shared-accounts/${accountId}/contribution-plan`, {
    frequency,
    ...(options?.agreed ? { agreed: true } : {})
  });
}

export function pauseContributionPlan(accountId: string) {
  return axios.put(`/shared-accounts/${accountId}/contribution-plan/pause`);
}

export function resumeContributionPlan(accountId: string) {
  return axios.put(`/shared-accounts/${accountId}/contribution-plan/resume`);
}

export function cancelContributionPlan(accountId: string) {
  return axios.put(`/shared-accounts/${accountId}/contribution-plan/cancel`);
}
