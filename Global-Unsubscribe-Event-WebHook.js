// Add axios 0.20.0 as a dependency under Functions Global Config, Dependencies
const axios = require('axios');

exports.handler = function (context, event, callback) {

  const instance = axios.create({
    baseURL: 'https://api.sendgrid.com/v3',
    timeout: 5000,
    headers: { 'Authorization': 'Bearer '+ context.API_KEY },
  });

  instance.get('/subusers').
  then((response) => {
    const subusers = response.data;

    promises = []
    // Only fetch unsubscribe events
    for (i in event) {
      if (event[i].event == 'unsubscribe') {
        console.log(event[i]);

        // Push this unsubscribe email to every other subuser
        for (s of subusers) {
          console.log(s.username + " " + event[i].email);

          promises.push(axios.post(
            'https://api.sendgrid.com/v3/asm/suppressions/global',
            { 'recipient_emails': [event[i].email] },
            { headers : {
                'Authorization': 'Bearer '+ context.API_KEY,
                'on-behalf-of': s.username
              }
            }
          ));

        }
      }
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

};
