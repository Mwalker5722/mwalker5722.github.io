import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FACEBOOK_CAPI_TOKEN;
    const TEST_CODE = process.env.FACEBOOK_TEST_CODE; // Optional for testing

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
      ...(TEST_CODE && { test_event_code: TEST_CODE }),
    };

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error('Facebook CAPI Error:', responseData);
      throw new Error('Failed to send conversion to Facebook');
    }
    
    console.log('Facebook responded successfully:', responseData);
    res.status(200).json({ message: 'Conversion sent successfully' });

  } catch (error) {
    console.error('Server Error in CAPI function:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
