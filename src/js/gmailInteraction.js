// @ts-check


import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";

console.log("ContentScript loaded")

let ciphertext, hiddenPolicies, identity="Alice"

function ensureCiphertextIsSet(timeout){    //See https://codepen.io/eanbowman/pen/jxqKjJ for how this works
    const start=Date.now()
    return new Promise(waitForCiphertext)

    function waitForCiphertext(resolve, reject){
        if(ciphertext) resolve(ciphertext)
        else if(timeout && Date.now()-start>=timeout) reject("Timeout")
        else setTimeout(waitForCiphertext.bind(this, resolve, reject), 100)
    }

}

function ensureHiddenPoliciesIsSet(timeout){    //See https://codepen.io/eanbowman/pen/jxqKjJ for how this works
    const start=Date.now()
    return new Promise(waitForHiddenPolicies)

    function waitForHiddenPolicies(resolve, reject){
        if(hiddenPolicies) resolve(hiddenPolicies)
        else if(timeout && Date.now()-start>=timeout) reject("Timeout")
        else setTimeout(waitForHiddenPolicies.bind(this, resolve, reject), 100)
    }
}


/**
 *
 * @param {Uint8Array} ciphertext
 * @returns {Promise<void>}
 */
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
}

const port = chrome.runtime.connect({name: "crypto"});

port.onMessage.addListener(function(msg) {
    console.log(msg)
    switch (msg.type){

        case "ciphertext":
            ciphertext=msg.ciphertext //BEWARE: messaging messes up types, here we have an object, not an Uint8array!
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

ensureCiphertextIsSet(5000).then(
    (ciphertext)=>askForDecryption(ciphertext).then(
        ()=>ensureHiddenPoliciesIsSet(2000).then(
            (hiddenPolicies)=>console.log("Hidden policies keys: ", Object.keys(hiddenPolicies))
        )
    )
)