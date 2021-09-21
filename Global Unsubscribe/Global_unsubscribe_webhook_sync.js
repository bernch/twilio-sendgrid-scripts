/*

This code runs on Twilio Function to capture unsubscribe events from SendGrid's 
Event Webhook and then push them to the rest of subusers.
See: https://www.twilio.com/docs/runtime/functions. 

1. Create a new Twilio function service, paste this code into a new function and 
add your SendGrid API key to the Twilio Function environment as `API_KEY`

2. Add axios 0.20.0 as a dependency under Functions Global Config, Dependencies

3. Point the subusers Event Webhook settings to POST `unsubscribe` events to 
the function's public URL.

4. Voila! Any unsubscribe events received at this Twilio function will be propagated to the subusers.

*/
// Add axios 0.20.0 as a dependency under Functions Global Config, Dependencies
const axios = require('axios');

exports.handler = function (context, event, callback) {

  const instance = axios.create({
    baseURL: 'https://api.sendgrid.com/v3',
    timeout: 5000,
    headers: { 'Authorization': 'Bearer ' + context.API_KEY },
  });

  // Only fetch unsubscribe events
  for (i in event) {
    if (event[i].event == 'unsubscribe') {
      console.log(event[i]);

      instance.get('/subusers').then((response) => {
        const subusers = response.data;

        promises = [];

        // Push this unsubscribe email to every other subuser
        for (s of subusers) {
          console.log(s.username + " " + event[i].email);

          promises.push(axios.post(
            'https://api.sendgrid.com/v3/asm/suppressions/global',
            { 'recipient_emails': [event[i].email] },
            {
              headers: {
                'Authorization': 'Bearer ' + context.API_KEY,
                'on-behalf-of': s.username
              }
            }
          ));

        }

        Promise.all(promises).then((response) => {
          console.log(response.data);
          return callback(null, response);
        }).catch((error) => {
          console.log(error);
          console.log(error.response.data);
          return callback(error);
        });

      })
        .catch((error) => {
          console.log(error);
          console.log(error.response.data);
          return callback(error);
        });

    }
  }

};