var express = require("express");
var router = express.Router();
const env = require('dotenv').config({ path: "./.env" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.get('/', function(req, res, next) {
    res.render('index', {title: "Express"})
})

router.post("/v1/order/payment", async function(req, res, next) {
    const { paymentMethodId, paymentIntentId, items, currency, useStripeSdk } = req.body;

    let total = 0;
    for(let i = 0; i < items.length; i++) {
        const current = items[i].amount * items[i].quantity;
        total += current;
    }

    let intent;
    if(paymentMethodId) {
        const request = {
            amount: total,
            currency: currency,
            payment_method: paymentMethodId,
            confirmation_method: "manual",
            confirm: true,
            use_stripe_sdk: useStripeSdk
        }
        // Stripe#create は Promise を返す
        intent = await stripe.paymentIntents.create(request);
    } else if(paymentIntentId){
        intent = await stripe.paymentIntents.confirm(paymentIntentId)
    }

    let response = {
        requireAction: true,
        clientSecret: "",
        paymentIntentStatus: ""
    }

    switch (intent.status) {
        case "requires_action":
            response.paymentIntentStatus = "requires_action";
            break;
        case "requires_source_action":
            response.paymentIntentStatus = "requires_source_action";
            response.requireAction = true
            break;
        case "requires_source":
            response.paymentIntentStatus = "requires_source";
            response.error = {
                messages: ["カードが拒否されました。別の決済手段をお試しください"]
            }
            break;
        case "succeeded":
            response.paymentIntentStatus = "succeeded";
            response.clientSecret = intent.client_secret;
            break;
        default:
            response.error = {
                messages: ["システムエラーが発生しました"]
            }
            break;
    }
    res.send(response);
});

module.exports = router;
