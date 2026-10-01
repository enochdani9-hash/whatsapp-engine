const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'buildflow_secret_123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // You will get this from Meta later

// 1. Webhook Verification (Required by Meta to link your app)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook successfully verified by Meta!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. Receiving Messages & Auto-Reply Logic
app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            
            const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
            const from = body.entry[0].changes[0].value.messages[0].from; // The customer's WhatsApp number
            const msgBody = body.entry[0].changes[0].value.messages[0].text.body.toLowerCase(); // What they typed
            
            console.log(`New message from ${from}: ${msgBody}`);

            // 3. Keyword Routing
            let replyText = "Hello from BuildFlow! Reply with 'price', 'location', or 'sizes' to see how this bot works.";
            
            if (msgBody.includes('price')) {
                replyText = "Our automation pipelines start at 300 GHS and sales engines at 800 GHS. How can we help scale your business?";
            } else if (msgBody.includes('location')) {
                replyText = "We operate fully remotely from Accra, building for clients globally!";
            } else if (msgBody.includes('sizes')) {
                replyText = "(Demo for a vendor): We have sizes 38 through 45 in stock today.";
            }

            // 4. Send the Automated Reply back via Meta API
            if (WHATSAPP_TOKEN) {
                try {
                    await axios({
                        method: 'POST',
                        url: `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
                        data: {
                            messaging_product: "whatsapp",
                            to: from,
                            text: { body: replyText }
                        },
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${WHATSAPP_TOKEN}`
                        }
                    });
                } catch (error) {
                    console.error("Error sending message:", error.response ? error.response.data : error.message);
                }
            }
        }
        res.sendStatus(200); // Always send 200 OK to Meta so they know you received the message
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => {
    console.log(`BuildFlow WhatsApp Engine running on port ${PORT}`);
});