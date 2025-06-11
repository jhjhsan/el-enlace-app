import * as MailComposer from 'expo-mail-composer';

export const sendEmailWithAttachment = async (email, subject, body, fileUri) => {
  const options = {
    recipients: [email],
    subject,
    body,
    attachments: [fileUri],
  };

  const result = await MailComposer.composeAsync(options);
  return result.status; // 'sent', 'saved', 'cancelled'
};
