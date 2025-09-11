// Import the Twilio helper library
const twilio = require('twilio');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { firstName, lastName, email, phone, company, smsConsent, textOnlyPreference, fbp, fbc } = req.body;
    const fullName = `${firstName} ${lastName}`;

    // --- Task 1: Forward the Lead to HubSpot ---
    try {
      const hubspotData = {
        fields: [
          { name: 'firstname', value: firstName },
          { name: 'lastname', value: lastName },
          { name: 'email', value: email },
          { name: 'phone', value: phone },
          { name: 'company', value: company },
          { name: 'hs_sms_consent', value: smsConsent },
          { name: 'text_only_preference', value: textOnlyPreference }
        ]
      };
      const portalId = process.env.HUBSPOT_PORTAL_ID;
      const formGuid = process.env.HUBSPOT_FORM_GUID;
      
      await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hubspotData)
      });
      console.log('Lead forwarded to HubSpot successfully.');
    } catch (hubspotError) {
      console.error('Error forwarding to HubSpot:', hubspotError);
    }

    // --- Task 2: Send the Instant SMS via Twilio ---
    // --- THIS IS THE CORRECTED LOGIC ---
    if (smsConsent && phone) { 
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        const client = twilio(accountSid, authToken);
        
        const messageBody = `Hi ${firstName}, Matthew from The Index Cloud here. Thanks for your interest! As promised, here's the direct link to book your 20-min demo: https://calendly.com/theindexcloud/20-minute-realtor-system-demo`;

        await client.messages.create({
          body: messageBody,
          from: twilioPhone,
          to: phone,
        });
        console.log(`SMS sent successfully to ${phone}`);
      } catch (twilioError) {
        console.error('Error sending SMS via Twilio:', twilioError);
      }
    }

    // --- Task 3: Trigger the Facebook Conversions API ---
    try {
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        const capiUrl = `${protocol}://${host}/api/send-conversion`;

        await fetch(capiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone, fullName, fbp, fbc })
        });
        console.log('CAPI function triggered successfully.');
    } catch (capiError) {
        console.error('Error triggering CAPI function:', capiError);
    }
    
    // --- Respond to the Frontend ---
    res.status(200).json({ message: 'Submission processed.' });

  } catch (error) {
    console.error('Main handler error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
