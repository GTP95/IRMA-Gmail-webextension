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
const header="Content-Type: application/postguard;\r\n" +
    "name=\"postguard.encrypted\"\r\n" +
    'Content-Transfer-Encoding: "base64"\r\n'
const subject="PostGuard encrypted email"


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

                //And now extract the email address from each string (at this point those are in the format "name <email.addrss@domain.com>", but only if they already are in the address book! That's why I need an if later to check the format
                const recipientsAddressesArray=[]
                let splittedArray
                for(let recipient of recipientsArray){
                    if(recipient.includes('<') && recipient.includes('>')) { //Dirty hack to detect the address' format, see previous comment    TODO: this could be probably made better by lloking for a method that properly extracts the email address or trying with a regex
                        splittedArray = recipient.split(new RegExp("[<>]"))
                        recipientsAddressesArray.push(splittedArray[1])
                    }
                    else recipientsAddressesArray.push(recipient)   //If the condition is false, the email address is already in the correct form. All of this assuming nobody has bot '<' and '>' in their address...
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

                        //Now construct a string with the correct format for compatibility with other IRMA addons
                        let finalMimeObjectToSend=header+response.ciphertext
                        console.log("Final MIME object to send:\n", finalMimeObjectToSend)

                        //Replace subject and body of the email with text explaining this is an IRMA encrypted email
                        const body="You received a PostGuard encrypted email from " + userEmail + "\n" +
                            "There are four ways to read this protected email:\n" +
                            "1) If you use Outlook and have already installed PostGuard, click on the \"Decrypt Email\"-button. \n" +
                            "This button can be found on the right side of the ribbon above.\n" +
                            "2) You can decrypt and read this email via https://www.postguard.eu/decrypt/.\n" +
                            "This website can only decrypt emails.\n" +
                            "3) You can install the free PostGuard addon in your own mail client.\n" +
                            "This works for Outlook and Thunderbird.\n" +
                            "4) You can install the free postGuard extension in your own browser and use Gmail's webmail+\n" +
                            "Download PostGuard via: https://www.postguard.eu\n" +
                            "After installation, you can not only decrypt and read emails but also all future Postguarded emails. \n" +
                            "Moreover, you can easily send and receive secure emails with the PostGuard addon within your email client.\n" +
                            "\n" +
                            "What is PostGuard?\n" +
                            "\n" +
                            "PostGuard is a service for secure emailing. Only the intended recipient(s) can decrypt\n" +
                            "and read the emails sent with PostGuard. \n" +
                            "The \"Encryption for all\"-team of the Radboud University has developed PostGuard.\n" +
                            "PostGuard uses the IRMA app for authentication. \n" +
                            "More information via: https://www.postguard.eu\n" +
                            "\n" +
                            "What is the IRMA app?\n" +
                            "\n" +
                            "When you receive a PostGuarded email, you need to use the IRMA app to prove that you\n" +
                            "really are the intended recipient of the email.\n" +
                            "IRMA is a separate privacy-friendly authentication app\n" +
                            "(which is used also for other authentication purposes).\n" +
                            "The free IMRA app can be downloaded via the App Store and Play Store.\n" +
                            "More information via: https://irma.app"

                        compose_ref.subject(subject)
                        compose_ref.body(body)

                        //And finally the fun part: try to add this as an attachment. For this, I use the hack suggested here: https://github.com/KartikTalwar/gmail.js/issues/635#issuecomment-808770417

                        const fileInput=compose.$el.find('[type=file]')[0]
                        const file=new File([finalMimeObjectToSend], "postguard.encrypted")
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