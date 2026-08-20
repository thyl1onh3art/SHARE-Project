import axios from 'axios';
import { InviteRecipient } from '../components/InviteRecipientsForm';

export const getValidInviteRecipients = (recipients: InviteRecipient[]) =>
  recipients.filter((r) => r.recipientEmail.trim() || r.recipientPhone.trim());

export const sendInvitesForAccount = async (
  sharedAccountId: string,
  recipients: InviteRecipient[]
): Promise<number> => {
  const validRecipients = getValidInviteRecipients(recipients).map((r) => ({
    recipientEmail: r.recipientEmail.trim() || undefined,
    recipientPhone: r.recipientPhone.trim() || undefined
  }));

  if (validRecipients.length === 0) {
    return 0;
  }

  if (validRecipients.length === 1) {
    await axios.post('/invites/send', {
      sharedAccountId,
      recipientEmail: validRecipients[0].recipientEmail,
      recipientPhone: validRecipients[0].recipientPhone
    });
    return 1;
  }

  const response = await axios.post('/invites/send-bulk', {
    sharedAccountId,
    recipients: validRecipients
  });

  return response.data.successCount || validRecipients.length;
};
