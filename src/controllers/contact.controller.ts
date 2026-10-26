import { Request, Response } from 'express';
import { sendContactEmail } from '../services/email.service';

export async function sendContactMessage(req: Request, res: Response) {
  const { name, email, subject, message, website } = req.body;

  if (website) {
    res.json({ message: 'Message sent' });
    return;
  }

  try {
    await sendContactEmail({ name, email, subject, message });
    res.json({ message: 'Message sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}