//@ts-check


import * as IrmaCore from "@privacybydesign/irma-core";
//import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";
import "gmail-js"
import {createMimeMessage} from 'mimetext'
import "@e4a/irmaseal-mail-utils"
import {ComposeMail} from "@e4a/irmaseal-mail-utils";


console.log("ContentScript loaded")

const extensionID="onpgmjjnnhdnidogdipohcogffphpmkg"

let ciphertext, hiddenPolicies


// loader-code: wait until gmail.js has finished loading, before triggering actual extension-code.
const loaderId = setInterval(() => {
    // @ts-ignore
    if (!window._gmailjs) {
        return;
    }

    clearInterval(loaderId);
    // @ts-ignore
    startExtension(window._gmailjs);
}, 100);

// actual extension-code
function startExtension(gmail) {
    console.log("Extension loading...");
    // @ts-ignore
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

                //create a mime object representing the email
                const msg=createMimeMessage()

                msg.setSender(userEmail)    //I have to duplicate some information for compatibility with the other addons
                msg.setRecipients(recipientsAddressesArray)
                msg.setSubject(compose_ref.subject())
                msg.setMessage('text/plain', compose_ref.body())    //Maybe also works without specifying the type, but body() returns a string anyway

                //Now send this constructed message to the service worker for encryption
                chrome.runtime.sendMessage(extensionID,
                    {
                        content: msg.asRaw(),
                        identifiers: recipientsAddressesArray,
                        request: "encrypt"
                    }, (response)=>{
                        console.log("Encrypted email: ", response.ciphertext)

                        //and now use irmaseal-mail-utils to construct the final message for compatibility with other addons
                        const composeMail=new ComposeMail()
                        composeMail.setSender(userEmail)
                        for(let recipient of emailRecipients['to']) composeMail.addRecipient(recipient)
                        for(let recipient of emailRecipients['cc']) composeMail.addCcRecipient(recipient)
                        for(let recipient of emailRecipients['bcc']) composeMail.addBccRecipient(recipient)
                        composeMail.setSubject("IRMA encrypted email")
                        composeMail.setPayload(new Uint8Array(response.ciphertext)) //This expects an array-like object, if I don't construct an array here we get just an object
                        const finalMimeObjectToSend=composeMail.getMimeMail()



                        //And finally the fun part: try to add this as an attachment. For this, I use the hack suggested here: https://github.com/KartikTalwar/gmail.js/issues/635#issuecomment-808770417

                        const fileInput=compose.$el.find('[type=file]')[0]
                        const file=new File([finalMimeObjectToSend], "attachedIRMAmail")
                        const dt=new DataTransfer()
                        dt.items.add(file)
                        fileInput.files=dt.files
                        const evt=document.createEvent('HTMLEvents')
                        evt.initEvent('change', false, true)
                        fileInput.dispatchEvent(evt)


                    }

                    )

            }, 'Custom Style Classes');
        });
    });
}