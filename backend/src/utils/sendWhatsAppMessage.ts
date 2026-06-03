export type SendWhatsAppMessagePayload = {
  to: string;
  body: string;
};

export const sendWhatsAppMessage = async ({ to, body }: SendWhatsAppMessagePayload): Promise<void> => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error('Missing WhatsApp configuration: WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_PHONE_NUMBER_ID are required.');
  }

  const url = `https://graph.facebook.com/v17.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${errorBody}`);
  }
};
