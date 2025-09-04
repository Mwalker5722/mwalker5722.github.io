// Import the Twilio helper library
const twilio = require('twilio');

// This is the main function that Vercel will run
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { fullName, email, phone, company, smsConsent } = req.body;

    // --- Task 1: Forward the Lead to HubSpot ---
    const hubspotData = {
      fields: [
        { name: 'full_name', value: fullName },
        { name: 'email', value: email },
        { name: 'phone', value: phone },
        { name: 'company', value: company },
        { name: 'hs_sms_consent', value: smsConsent } // Ensure this property name matches in HubSpot
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


    // --- Task 2: Send the Instant SMS via Twilio ---
    if (smsConsent && phone) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      const client = twilio(accountSid, authToken);

      // Get the first name for personalization
      const firstName = fullName.split(' ')[0];
      const messageBody = `Hi ${firstName}, Matthew from The Index Cloud here. Thanks for your interest! As promised, here's the direct link to book your 20-min demo: https://calendly.com/theindexcloud/20-minute-realtor-system-demo`;

      await client.messages.create({
        body: messageBody,
        from: twilioPhone,
        to: phone,
      });
      console.log(`SMS sent successfully to ${phone}`);
    }

    // --- Respond to the Frontend ---
    return res.status(200).json({ message: 'Submission successful.' });

  } catch (error) {
    console.error('An error occurred:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
