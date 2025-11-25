/**
 * Helper utilities for sending WhatsApp typing indicators and placeholder messages
 * to mask latency during AI processing
 */

interface WhatsAppAccount {
  access_token: string;
  phone_number_id: string;
}

/**
 * Send a read receipt for a message
 */
export async function sendReadReceipt(
  account: WhatsAppAccount,
  messageId: string
): Promise<void> {
  try {
    await fetch(
      `https://graph.facebook.com/v24.0/${account.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      }
    );
    console.log('✓ Read receipt sent for message:', messageId);
  } catch (error) {
    console.error('Failed to send read receipt:', error);
    // Non-critical, don't throw
  }
}

/**
 * Send a reaction emoji to a message (provides immediate feedback)
 */
export async function sendReaction(
  account: WhatsAppAccount,
  messageId: string,
  customerPhone: string,
  emoji: string = '👀'
): Promise<void> {
  try {
    await fetch(
      `https://graph.facebook.com/v24.0/${account.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'reaction',
          reaction: {
            message_id: messageId,
            emoji: emoji
          }
        })
      }
    );
    console.log(`✓ Reaction ${emoji} sent for message:`, messageId);
  } catch (error) {
    console.error('Failed to send reaction:', error);
    // Non-critical, don't throw
  }
}

/**
 * Send a text message (used for placeholder messages)
 */
export async function sendTextMessage(
  account: WhatsAppAccount,
  customerPhone: string,
  message: string
): Promise<void> {
  try {
    await fetch(
      `https://graph.facebook.com/v24.0/${account.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: customerPhone,
          type: 'text',
          text: { body: message }
        })
      }
    );
    console.log('✓ Text message sent to:', customerPhone);
  } catch (error) {
    console.error('Failed to send text message:', error);
    throw error;
  }
}
