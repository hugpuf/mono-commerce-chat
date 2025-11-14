// Helper functions for whatsapp-ai-handler

/**
 * Check if current time is within quiet hours
 */
export function checkQuietHours(quietHours: any[]): boolean {
  if (!Array.isArray(quietHours) || quietHours.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  for (const schedule of quietHours) {
    if (!schedule.enabled) continue;
    
    // Check if current day is in the schedule
    if (schedule.days && !schedule.days.includes(currentDay)) {
      continue;
    }

    const startTime = schedule.start;
    const endTime = schedule.end;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime <= endTime) {
        return true;
      }
    } else {
      // Normal range (e.g., 13:00 - 17:00)
      if (currentTime >= startTime && currentTime <= endTime) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Analyze sentiment of customer message using AI
 * Returns a score between -1 (very negative) and 1 (very positive)
 */
export async function analyzeSentiment(message: string): Promise<number> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a sentiment analyzer. Respond ONLY with a number between -1 and 1, where -1 is extremely negative/angry, 0 is neutral, and 1 is extremely positive. No explanation, just the number." 
          },
          { role: "user", content: `Analyze sentiment: "${message}"` }
        ]
      })
    });

    if (!response.ok) {
      console.error('Sentiment analysis failed:', response.status);
      return 0; // Default to neutral if analysis fails
    }

    const data = await response.json();
    const sentimentText = data.choices[0]?.message?.content?.trim() || "0";
    const sentiment = parseFloat(sentimentText);
    
    return isNaN(sentiment) ? 0 : Math.max(-1, Math.min(1, sentiment));
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return 0; // Default to neutral on error
  }
}

/**
 * Check if response contains compliance-relevant keywords
 */
export function shouldInjectCompliance(response: string): boolean {
  const complianceKeywords = [
    'refund',
    'return',
    'warranty',
    'exchange',
    'cancel',
    'money back',
    'guarantee',
    'policy',
    'terms',
    'conditions'
  ];

  const lowerResponse = response.toLowerCase();
  return complianceKeywords.some(keyword => lowerResponse.includes(keyword));
}
