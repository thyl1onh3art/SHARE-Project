import axios from 'axios';
import { InviteRecipient } from '../components/InviteRecipientsForm';

export const getValidInviteRecipients = (recipients: InviteRecipient[]) =>
  recipients.filter((r) => r.recipientEmail.trim() || r.recipientPhone.trim());

export interface SendInvitesResult {
  success: number;
  failed: string[];
}

/**
 * Send trip invitations sequentially via existing /invites/send.
 * Bulk /send-bulk is deliberately not used — sequential keeps auth and
 * per-recipient errors clear without a second write path.
 */
export const sendInvitesForAccount = async (
  sharedAccountId: string,
  recipients: InviteRecipient[]
): Promise<SendInvitesResult> => {
  const validRecipients = getValidInviteRecipients(recipients);
  const results: SendInvitesResult = { success: 0, failed: [] };

  for (const recipient of validRecipients) {
    try {
      await axios.post('/invites/send', {
        sharedAccountId,
        recipientEmail: recipient.recipientEmail.trim() || undefined,
        recipientPhone: recipient.recipientPhone.trim() || undefined
      });
      results.success += 1;
    } catch (err: any) {
      const label = recipient.recipientEmail || recipient.recipientPhone || 'recipient';
      results.failed.push(`${label}: ${err.response?.data?.message || 'failed'}`);
    }
  }

  return results;
};
