// This is your new serverless function: /api/send-conversion.js

// We'll use the built-in crypto module for hashing
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Get the Pixel ID and Access Token from the Vercel Environment Variables
    const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FACEBOOK_CAPI_TOKEN;

    // Get the data sent from the front-end form
    const { email, phone, fullName, fbp, fbc } = req.body;

    // It's critical to get the user's IP and User-Agent for better matching
    const clientIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientUserAgent = req.headers['user-agent'];

    // Get the current timestamp in seconds
    const eventTime = Math.floor(Date.now() / 1000);

    // Prepare the data payload for the Conversions API
    const eventData = {
      data: [
        {
          event_name: 'Lead',
          event_time: eventTime,
          action_source: 'website',
          // A unique ID for this specific event to prevent duplication
          event_id: `lead_${eventTime}_${Math.random().toString(36).substring(7)}`, 
          user_data: {
            // Hash the data for privacy, as recommended by Facebook
            em: [crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')],
            ph: [crypto.createHash('sha256').update(phone).digest('hex')],
            fn: [crypto.createHash('sha256').update(fullName.toLowerCase()).digest('hex')],
            client_ip_address: clientIpAddress,
            client_user_agent: clientUserAgent,
            fbp: fbp, // Facebook Browser ID cookie
            fbc: fbc, // Facebook Click ID cookie
          },
        },
      ],
    };

    // The URL for the Facebook Graph API
    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    // Send the data to Facebook
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      // If Facebook returned an error, log it for debugging
      console.error('Facebook CAPI Error:', responseData);
      throw new Error('Failed to send conversion to Facebook');
    }

    // Send a success response back to the front-end
    res.status(200).json({ message: 'Conversion sent successfully', fbResponse: responseData });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
