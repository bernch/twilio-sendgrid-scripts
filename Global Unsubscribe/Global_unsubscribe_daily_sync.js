/*

This script fetches all global unsubscribes from your SendGrid subusers, 
combines it into a Set and propagates it back to the subusers.

Note:
1. The v3/suppression/unsubscribes API returns only the first 500 unsubscribes, 
you'll need to modify the API call using a combination of offset, start_time 
and end_time if there are more than 500 unsubscribes in a subuser.

See: https://sendgrid.api-docs.io/v3.0/suppressions-global-suppressions/retrieve-all-global-suppressions

2. The script accepts a Twilio SendGrid API key from a .env file containing a `API_KEY` variable.

*/

const axios = require('axios');
require('dotenv').config();
// axios.<method> will now provide autocomplete and parameter typings

const instance = axios.create({
  baseURL: 'https://api.sendgrid.com/v3',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer '+ process.env.API_KEY },
});

instance.get('/subusers').
then((response) => {

  (async () => {
    const subusers = response.data;
    let promises = [];

    // Fetching subusers and their global unsubscribes added in the past 1 day
    today = new Date();
    start_time = Math.floor(new Date().setDate(today.getDate() - 1) / 1000)
    end_time = Math.floor(today.getTime() / 1000);

    for (s of subusers) {
      promises.push(axios.get(
        'https://api.sendgrid.com/v3/suppression/unsubscribes',
        {
          params: {
            'start_time': start_time,
            'end_time': end_time
          },
          headers: {
            'Authorization': 'Bearer '+ process.env.API_KEY,
            'on-behalf-of': s.username
          }
        }
      ));
    }

    // Pushing unsubscribes into a set
    const res = await Promise.all(promises);
    let unsubscribes = new Set();
    res.forEach(r => {
      r.data.forEach(d => unsubscribes.add(d.email));
    });
    promises = [];

    unsubscribes = Array.from(unsubscribes);

    // POSTing merged array back to subusers
    for (s of subusers) {
      // console.log(s.username + ' ' + JSON.stringify(unsubscribes));
      promises.push(axios.post(
        'https://api.sendgrid.com/v3/asm/suppressions/global',
        { 'recipient_emails': unsubscribes },
        {
          headers: {
            'Authorization': 'Bearer '+ process.env.API_KEY,
            'on-behalf-of': s.username
          }
        }
      ));
    }

    Promise.all(promises).then((response) => {
      console.log(response);
    }).catch((error) => {
      console.log(error.response.data);
    });

  })();

});
