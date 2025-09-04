// Import the Twilio helper library
const twilio = require('twilio');

// This is the main function that Vercel will run
export default async function handler(req, res) {
  console.log('API function started.'); // Log that the function was triggered

  if (req.method !== 'POST') {
    console.log('Method not allowed.');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { fullName, email, phone, company, smsConsent } = req.body;
    console.log('Received form data:', { fullName, email, phone, company, smsConsent });

    // --- Task 1: Forward the Lead to HubSpot ---
    try {
      console.log('Attempting to send data to HubSpot...');
      const hubspotData = {
        fields: [
          { name: 'full_name', value: fullName },
          { name: 'email', value: email },
          { name: 'phone', value: phone },
          { name: 'company', value: company },
          { name: 'hs_sms_consent', value: smsConsent }
        ]
      };
      // Safely access HubSpot credentials from Environment Variables
      const portalId = process.env.HUBSPOT_PORTAL_ID;
      const formGuid = process.env.HUBSPOT_FORM_GUID;
      
      const hubspotResponse = await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hubspotData)
      });

      if (!hubspotResponse.ok) {
        const errorBody = await hubspotResponse.text();
        console.error('HubSpot API Error:', errorBody);
        throw new Error('HubSpot submission failed.');
      }
      
      console.log('Lead forwarded to HubSpot successfully.');

    } catch (hubspotError) {
      console.error('Caught an error during HubSpot submission:', hubspotError);
    }


    // --- Task 2: Send the Instant SMS via Twilio ---
    if (smsConsent && phone) {
      try {
        console.log('Attempting to send SMS via Twilio...');
        // Safely access Twilio credentials from Environment Variables
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        
        if (!accountSid || !authToken || !twilioPhone) {
          throw new Error('Twilio environment variables are not set.');
        }

        const client = twilio(accountSid, authToken);

        const firstName = fullName.split(' ')[0];
        const messageBody = `Hi ${firstName}, Matthew from The Index Cloud here. Thanks for your interest! As promised, here's the direct link to book your 20-min demo: https://calendly.com/theindexcloud/20-minute-realtor-system-demo`;

        await client.messages.create({
          body: messageBody,
          from: twilioPhone,
          to: phone,
        });
        console.log(`SMS sent successfully to ${phone}`);
        
      } catch (twilioError) {
        console.error('Caught an error during Twilio submission:', twilioError);
      }
    } else {
        console.log('Skipping SMS: No consent or no phone number.');
    }

    // --- Respond to the Frontend ---
    console.log('API function finished successfully.');
    return res.status(200).json({ message: 'Submission successful.' });

  } catch (error) {
    console.error('A critical error occurred in the main handler:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
