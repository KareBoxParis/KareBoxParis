paypal.Buttons({

createSubscription:function(data,actions){

return actions.subscription.create({

plan_id:
"TON_PLAN_PAYPAL"

});

},


onApprove:function(data){

console.log(
data.subscriptionID
);


alert(
"Bienvenue chez KareBoxParis"
);


}


}).render(
"#paypal-button"
);
