import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

interface SendSmsInput {
  to: string;
  body: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(input: SendSmsInput): Promise<void> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_PHONE;

    if (!sid || !token || !from) {
      throw new Error('Twilio credentials are not configured');
    }

    try {
      const client = twilio(sid, token);
      await client.messages.create({
        to: input.to,
        from,
        body: input.body,
      });
    } catch (error) {
      this.logger.warn(`SMS send failed for ${input.to}`);
      this.logger.debug(String(error));
      throw error;
    }
  }
}
