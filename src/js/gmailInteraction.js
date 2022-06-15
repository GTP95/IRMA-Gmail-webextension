


import * as IrmaCore from "@privacybydesign/irma-core";
//import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";
import "gmail-js"


console.log("ContentScript loaded")

const extensionID="onpgmjjnnhdnidogdipohcogffphpmkg"

let ciphertext, hiddenPolicies


// loader-code: wait until gmail.js has finished loading, before triggering actual extension-code.
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
            //adding button, finally:
            const compose_ref = gmail.dom.composes()[0];
            gmail.tools.add_compose_button(compose_ref, 'IRMA', function() {

                const emailRecipients=compose_ref.recipients() //I'm not getting how to specify options, working with this for now
                const recipientsArray=[]
                for(let recipient of emailRecipients['to']) recipientsArray.push(recipient)
                for(let recipient of emailRecipients['cc']) recipientsArray.push(recipient)
                for(let recipient of emailRecipients['bcc']) recipientsArray.push(recipient)

                //And now extract the email address from each string (at this point those are in the format "name <email.addrss@domain.com>"
                const recipientsAddressesArray=[]
                let splittedArray
                for(let recipient of recipientsArray){
                    splittedArray=recipient.split(new RegExp("[<>]"))
                    recipientsAddressesArray.push(splittedArray[1])
                }
                console.log("Email addresses: ", recipientsAddressesArray)

                const emailBody=compose_ref.body()
                const emailSubject=compose_ref.subject()
                console.log("Recipients: ", recipientsArray)

                chrome.runtime.sendMessage(extensionID,             //Encrypt the email's body
                    {
                        content: emailBody,
                        identifiers: recipientsAddressesArray,
                        request: "encrypt"
            }, (response)=>compose_ref.body(response.ciphertext)
            )
                chrome.runtime.sendMessage(extensionID,        //Encrypt the email's subject
                    {
                             content: emailSubject,
                             identifiers: recipientsAddressesArray,
                             request: "encrypt"
                    }, (response)=>compose_ref.subject(response.ciphertext)
                    )
            }, 'Custom Style Classes');
        });
    });
}