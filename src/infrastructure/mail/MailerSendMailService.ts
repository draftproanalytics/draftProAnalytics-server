import { MailService } from '@/domain/mail/services/MailService';
import { MailMessage } from '@/domain/mail/value-objects/MailMessage';
import { MailerSend, EmailParams, Recipient } from 'mailersend';
import { createLogger } from '@/utils/Logger';

export class MailerSendMailService implements MailService {
  private mailer: MailerSend;
  private logger = createLogger('MailerSendMailService');

  constructor(apiKey?: string) {
    // 1. Fallback to process.env if no key was passed or if it's an empty string
    const finalApiKey = apiKey?.trim() || process.env.MAILERSEND_API_KEY;

    // 2. Validate that we actually have a usable key
    if (!finalApiKey || finalApiKey.trim().length === 0) {
      throw new Error('MailerSend API key is missing.');
    }

    // 3. Initialize the MailerSend client
    this.mailer = new MailerSend({ apiKey: finalApiKey });
  }

  async send({ to, subject, html, from }: MailMessage): Promise<void> {
    const recipients = [new Recipient(to)];

    const emailParams = new EmailParams()
      .setFrom({
        email: from ?? 'noreply@draftproanalytics.com',
        name: 'DraftProAnalytics',
      })
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(html);

    try {
      await this.mailer.email.send(emailParams);
    } catch (err: unknown) {
      console.error('MailerSend raw error:', JSON.stringify(err, null, 2));

      const error = err as any;

      const statusCode =
        error?.statusCode ??
        error?.status ??
        error?.response?.status ??
        error?.response?.statusCode;

      const message =
        error?.message ??
        error?.body?.message ??
        error?.response?.body?.message ??
        error?.response?.data?.message ??
        'Unknown MailerSend error';

      const details =
        error?.body ??
        error?.response?.body ??
        error?.response?.data ??
        error;

      throw new Error(
        `MailerSend error${statusCode ? ` ${statusCode}` : ''}: ${message}. Details: ${JSON.stringify(details)}`,
      );
    }
  }
}