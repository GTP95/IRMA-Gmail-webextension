// @ts-check


import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";
import "gmail-js"

console.log("ContentScript loaded")

//let ciphertext, hiddenPolicies, identity="Alice"
//
//function ensureCiphertextIsSet(timeout){    //See https://codepen.io/eanbowman/pen/jxqKjJ for how this works
//    const start=Date.now()
//    return new Promise(waitForCiphertext)
//
//    function waitForCiphertext(resolve, reject){
//        if(ciphertext) resolve(ciphertext)
//        else if(timeout && Date.now()-start>=timeout) reject("Timeout")
//        else setTimeout(waitForCiphertext.bind(this, resolve, reject), 100)
//    }
//
//}
//
//function ensureHiddenPoliciesIsSet(timeout){    //See https://codepen.io/eanbowman/pen/jxqKjJ for how this works
//    const start=Date.now()
//    return new Promise(waitForHiddenPolicies)
//
//    function waitForHiddenPolicies(resolve, reject){
//        if(hiddenPolicies) resolve(hiddenPolicies)
//        else if(timeout && Date.now()-start>=timeout) reject("Timeout")
//        else setTimeout(waitForHiddenPolicies.bind(this, resolve, reject), 100)
//    }
//}
//
//
///**
// *
// * @param {Uint8Array} ciphertext
// * @returns {Promise<void>}
// */
//async function askForDecryption(ciphertext){
//    console.log("Asking for decryption now")
//    //First, we need to get the hidden policies. Let's ask the BackgroundScript for this
//    port.postMessage(
//        {
//            content: ciphertext,
//            request: "hidden policies"
//        }
//    )
//}
//
///**
// * Requests the user's key to the trusted IRMA server
// * @param identity {String}
// * @param hiddenPolicies {Object}
// * @param timeout {number} Milliseconds to wait for a key, afterwards fail. Typically 60000 (1 minute)
// */
//async function requestKey(hiddenPolicies, identity, timeout) {
//    const start=Date.now()  //To set a timeout
//    const pkg = "https://main.irmaseal-pkg.ihub.ru.nl"
//    const keyRequest = {
//        con: [{t: "irma-demo.gemeente.personalData.fullname", v: identity}],
//        validity: 600, // 1 minute
//    };
//
//    const timestamp = hiddenPolicies[identity].ts;
//
//    const session = {
//        url: pkg,
//        start: {
//            url: (o) => `${o.url}/v2/request/start`,
//            method: "POST",
//            headers: {"Content-Type": "application/json"},
//            body: JSON.stringify(keyRequest),
//        },
//        mapping: {
//            // temporary fix
//            sessionPtr: (r) => {
//                const ptr = r.sessionPtr;
//                ptr.u = `https://ihub.ru.nl/irma/1/${ptr.u}`;
//                return ptr;
//            },
//        },
//        result: {
//            url: (o, {sessionToken}) => `${o.url}/v2/request/jwt/${sessionToken}`,
//            parseResponse: (r) => {
//                return r
//                    .text()
//                    .then((jwt) =>
//                        fetch(`${pkg}/v2/request/key/${timestamp.toString()}`, {
//                            headers: {
//                                Authorization: `Bearer ${jwt}`,
//                            },
//                        })
//                    )
//                    .then((r) => r.json())
//                    .then((json) => {
//                        if (json.status !== "DONE" || json.proofStatus !== "VALID")
//                            throw new Error("not done and valid");
//                        return json.key;
//                    })
//                    .catch((e) => console.log("error: ", e));
//            },
//        },
//    };
//
//    const irma = new IrmaCore({debugging: true, session});
//
//    irma.use(IrmaClient);
//    irma.use(IrmaPopup);
//
//    const usk = await irma.start();
//    console.log("retrieved usk: ", usk);
//
//    return new Promise(waitForUserKey)
//
//    function waitForUserKey(resolve, reject){
//        if(usk) resolve(usk)
//        else if(timeout && Date.now()-start>=timeout) reject("Timeout")
//        else setTimeout(waitForUserKey.bind(this, resolve, reject), 500)
//    }
//}
//
//const port = chrome.runtime.connect({name: "crypto"});
//
//port.onMessage.addListener(function(msg) {
//    console.log(msg)
//    switch (msg.type){
//
//        case "ciphertext":
//            ciphertext=msg.ciphertext //BEWARE: messaging messes up types, here we have an object, not an Uint8array!
//            break
//
//        case "plaintext":
//            console.log("Decrypted plaintext: ", msg.plaintext)
//            break
//
//        case "hidden policies":
//            hiddenPolicies=msg.content
//            console.log(hiddenPolicies)
//            break
//
//        case "error":
//            console.log("Something went wrong, inspect message for clues")
//            break
//
//        default: console.log("Generic messaging error, probably a typo in msg.type?")
//    }
//});
//
//port.postMessage(
//    {
//        content: "Knock knock",
//        request: "encrypt"
//    }
//);
//
//ensureCiphertextIsSet(5000).then(
//    (ciphertext)=>askForDecryption(ciphertext).then(
//        ()=>ensureHiddenPoliciesIsSet(2000).then(
//            (hiddenPolicies)=>requestKey(hiddenPolicies, identity, 60000).then(
//                (usk)=> port.postMessage(
//                    {
//                        content: ciphertext,
//                        identity: identity,
//                        usk: usk,
//                        request: "decrypt"
//                    }
//                )
//            )
//        )
//    )
//)
//

// loader-code: wait until gmailjs has finished loading, before triggering actual extensiode-code.
const loaderId = setInterval(() => {
    if (!window._gmailjs) {
        return;
    }

    clearInterval(loaderId);
    startExtension(window._gmailjs);
}, 100);

// actual extension-code
function startExtension(gmail) {
    console.log("Extension loading...");
    window.gmail = gmail;

    gmail.observe.on("load", () => {
        const userEmail = gmail.get.user_email();
        console.log("Hello, " + userEmail + ". This is your extension talking!");

        gmail.observe.on("view_email", (domEmail) => {
            console.log("Looking at email:", domEmail);
            const emailData = gmail.new.get.email_data(domEmail);
            console.log("Email data:", emailData);
        });

        gmail.observe.on("compose", (compose) => {
            console.log("New compose window is opened!", compose);
        });
    });
}