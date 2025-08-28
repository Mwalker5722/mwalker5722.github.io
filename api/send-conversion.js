// This is your updated serverless function: /api/send-conversion.js

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FACEBOOK_CAPI_TOKEN;

    // IMPORTANT: Get the Test Event Code from Facebook's "Test Events" tab and add it as a new Environment Variable in Vercel.
    // Name the variable: FACEBOOK_TEST_CODE
    const TEST_CODE = process.env.FACEBOOK_TEST_CODE;

    const { email, phone, fullName, fbp, fbc } = req.body;
    const clientIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientUserAgent = req.headers['user-agent'];
    const eventTime = Math.floor(Date.now() / 1000);

    const eventData = {
      data: [
        {
          event_name: 'Lead',
          event_time: eventTime,
          action_source: 'website',
          event_id: `lead_${eventTime}_${Math.random().toString(36).substring(7)}`, 
          user_data: {
            em: [crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')],
            ph: [crypto.createHash('sha256').update(phone).digest('hex')],
            fn: [crypto.createHash('sha256').update(fullName.toLowerCase()).digest('hex')],
            client_ip_address: clientIpAddress,
            client_user_agent: clientUserAgent,
            fbp: fbp,
            fbc: fbc,
          },
        },
      ],
      // NEW: Add the test_event_code to the payload if it exists
      ...(TEST_CODE && { test_event_code: TEST_CODE }),
    };

    // NEW: Log the data we are about to send for better debugging
    console.log('Sending this payload to Facebook:', JSON.stringify(eventData, null, 2));

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Facebook CAPI Error:', responseData);
      throw new Error('Failed to send conversion to Facebook');
    }
    
    // NEW: Log the successful response from Facebook
    console.log('Facebook responded successfully:', responseData);

    res.status(200).json({ message: 'Conversion sent successfully', fbResponse: responseData });

  } catch (error) {
    console.error('Server Error in function:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
