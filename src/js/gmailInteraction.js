// @ts-check


import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";

console.log("ContentScript loaded")

let ciphertext, hiddenPolicies;

function pollForCiphertext(){
    if (ciphertext){
        askForDecryption(ciphertext)
    }
    else setTimeout(pollForCiphertext, 100)
}


function pollHiddenPolicies(){
    console.log("Now polling for hidden policies")
    if(hiddenPolicies){
        console.log("hidden policies: ", hiddenPolicies)
    }
    else setTimeout(hiddenPolicies, 100)
}


async function askForDecryption(ciphertext){
    console.log("Asking for decryption now")
    let hidden
    //First, we need to get the hidden policies. Let's ask the BackgroundScript for this
    port.postMessage(
        {
            content: ciphertext,
            request: "hidden policies"
        }
    )

    //We will, hopefully and eventually, get an answer. The hidden policies are stored in the variable "hiddenPolicies"
    //Let's start polling for the answer
    pollHiddenPolicies()
}

const port = chrome.runtime.connect({name: "crypto"});

port.onMessage.addListener(function(msg) {
    console.log(msg)
    switch (msg.type){

        case "ciphertext":
            ciphertext=msg.ciphertext
            break

        case "plaintext":
            console.log("Messaging works!")
            break

        case "hidden policies":
            hiddenPolicies=msg.content
            console.log(hiddenPolicies)
            break

        case "error":
            console.log("Something went wrong, inspect message for clues")
            break

        default: console.log("Generic messaging error, probably a typo in msg.type?")
    }
});

port.postMessage(
    {
        content: "Knock knock",
        request: "encrypt"
    }
);

pollForCiphertext()
