import axios from 'axios';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
};

const getTelegramConfig = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    console.warn('[telegram] Skipping order notification because TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.');
    return null;
  }

  return { botToken, chatId };
};

export const sendTelegramMessage = async (message: string): Promise<void> => {
  const config = getTelegramConfig();
  if (!config) {
    return;
  }

  try {
    const response = await axios.post<TelegramSendMessageResponse>(
      `${TELEGRAM_API_BASE_URL}/bot${config.botToken}/sendMessage`,
      {
        chat_id: config.chatId,
        text: message,
      },
      {
        timeout: 10000,
      }
    );

    if (!response.data.ok) {
      throw new Error(response.data.description || 'Telegram API returned an unsuccessful response.');
    }
  } catch (error) {
    if (axios.isAxiosError<TelegramSendMessageResponse>(error)) {
      throw new Error(error.response?.data?.description || error.message || 'Could not send Telegram message.');
    }

    throw error instanceof Error ? error : new Error('Could not send Telegram message.');
  }
};
