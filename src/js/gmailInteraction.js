// @ts-check

import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";
import "gmail-js";
import { createMimeMessage } from "mimetext";
import { ComposeMail } from "@e4a/irmaseal-mail-utils";
import { objectToUInt8array } from "./helpers";

console.log("ContentScript loaded");

const extensionID = "hmjfmafnafhppnngfnkjccjdjgnannea";
const header =
  "Content-Type: application/postguard;\r\n" +
  'name="postguard.encrypted"\r\n' +
  'Content-Transfer-Encoding: "base64"\r\n';
const subject = "PostGuard encrypted email";
const pkg = "https://main.irmaseal-pkg.ihub.ru.nl";

let ciphertext, hiddenPolicies;

/**
 * Wraps up the steps needed
 * @param extensionID
 * @param message
 * @param identity
 * @param callback
 */
function requestDecryption(extensionID, message, identity, callback) {
  //First we need to get the hidden policies. Why they play hide-and-seek, is still debated
  chrome.runtime.sendMessage(
    extensionID,
    {
      content: message,
      request: "hidden policies",
    },
    async (response) => {
      const hidden = response.content;
      const keyRequest = {
        con: [{ t: "pbdf.sidn-pbdf.email.email", v: identity }],
        validity: 600, // 1 minute
      };
      const timestamp = hidden[identity].ts;
      const session = {
        url: pkg,
        start: {
          url: (o) => `${o.url}/v2/request/start`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(keyRequest),
        },
        mapping: {
          // temporary fix
          sessionPtr: (r) => {
            const ptr = r.sessionPtr;
            ptr.u = `https://ihub.ru.nl/irma/1/${ptr.u}`;
            return ptr;
          },
        },
        result: {
          url: (o, { sessionToken }) =>
            `${o.url}/v2/request/jwt/${sessionToken}`,
          parseResponse: (r) => {
            return r
              .text()
              .then((jwt) =>
                fetch(`${pkg}/v2/request/key/${timestamp.toString()}`, {
                  headers: {
                    Authorization: `Bearer ${jwt}`,
                  },
                })
              )
              .then((r) => r.json())
              .then((json) => {
                if (json.status !== "DONE" || json.proofStatus !== "VALID")
                  throw new Error("not done and valid");
                return json.key;
              })
              .catch((e) => console.log("error: ", e));
          },
        },
      };

      const irma = new IrmaCore({ debugging: true, session }); //TODO: ask if it's better to switch to false

      irma.use(IrmaClient);
      irma.use(IrmaPopup);

      const usk = await irma.start();
      console.log("retrieved usk: ", usk);

      //Now that we've got the key (the one that was in the mausoleum...) we can go on and decrypt the message
      chrome.runtime.sendMessage(
        extensionID,
        {
          request: "decrypt",
          content: message,
          usk: usk,
          identity: identity,
        },
        callback
      );
    }
  );
}

/**
 * Returns true if attachment has the name "postguard.encrypted".
 * Unfortunately I can't use the MIME type to detect PostGuard attachments, as Gmail changes it to "application/octet-stream"
 * @param attachment
 * @returns {boolean}
 */
function isPostguardAttachment(attachment) {
  return attachment.name.toLowerCase() === "postguard.encrypted";
}

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

      const attachments = emailData.attachments;
      for (let attachment in attachments) {
        console.log("Processing attachment: ", attachments[attachment]); //I was expecting "attachment" to contain the object representing the attachment. It contains the index instead.
        //If the email contains PostGuard attachments, retrieve and decrypt them
        if (isPostguardAttachment(attachments[attachment])) {
          gmail.tools
            .make_request_download_promise(attachments[attachment].url, true)
            .then((postGuardMessage) =>
              requestDecryption(
                extensionID,
                postGuardMessage,
                userEmail,
                (response) => {
                  console.log("Response object: ", response);
                  console.log("Decrypted: ", response.plaintext);
                }
              )
            );
        }
      }
    });

    gmail.observe.on("compose", (compose) => {
      console.log("New compose window is opened!", compose);
      //adding button, finally:
      const compose_ref = gmail.dom.composes()[0];
      gmail.tools.add_compose_button(
        compose_ref,
        "IRMA",
        function () {
          const emailRecipients = compose_ref.recipients(); //I'm not getting how to specify options, working with this for now
          const recipientsArray = [];
          for (let recipient of emailRecipients["to"])
            recipientsArray.push(recipient);
          for (let recipient of emailRecipients["cc"])
            recipientsArray.push(recipient);
          for (let recipient of emailRecipients["bcc"])
            recipientsArray.push(recipient);

          //And now extract the email address from each string (at this point those are in the format "name <email.addrss@domain.com>", but only if they already are in the address book! That's why I need an if later to check the format
          const recipientsAddressesArray = [];
          let splittedArray;
          for (let recipient of recipientsArray) {
            if (recipient.includes("<") && recipient.includes(">")) {
              //Dirty hack to detect the address' format, see previous comment    TODO: this could be probably made better by looking for a method that properly extracts the email address or trying with a regex
              splittedArray = recipient.split(new RegExp("[<>]"));
              recipientsAddressesArray.push(splittedArray[1]);
            } else recipientsAddressesArray.push(recipient); //If the condition is false, the email address is already in the correct form. All of this assuming nobody has bot '<' and '>' in their address...
          }
          console.log("Email addresses: ", recipientsAddressesArray);

          const emailBody = compose_ref.body();
          const emailSubject = compose_ref.subject();
          const emailAttachments = compose_ref.attachments();
          console.log("Recipients: ", recipientsArray);
          console.log("Attachments: ", emailAttachments);

          //create a mime object representing the email
          const msg = createMimeMessage();

          msg.setSender(userEmail); //I have to duplicate some information for compatibility with the other addons
          // @ts-ignore
          msg.setRecipients(recipientsAddressesArray);
          msg.setSubject(emailSubject);
          msg.setMessage("text/plain", emailBody); //Maybe also works without specifying the type, but body() returns a string anyway

          // Let's grab all the attachments
          let listOfAttchmentPromises = [];
          for (let attachment in emailAttachments) {
            listOfAttchmentPromises.push(
              // @ts-ignore
              gmail.tools.make_request_download_promise(attachment.url, true)
            );
          }

          console.log("List of attachment promises: ", listOfAttchmentPromises);

          //And add them to the email
          for (let promise in listOfAttchmentPromises) {
            // @ts-ignore
            promise.then((result) => {
              // @ts-ignore
              msg.setAttachment(result);
            });
          }

          console.log(
            "Sending this to the service worker for encryption: ",
            msg.asRaw()
          );

          //Now send this constructed message to the service worker for encryption
          chrome.runtime.sendMessage(
            extensionID,
            {
              content: msg.asRaw(),
              identifiers: recipientsAddressesArray,
              request: "encrypt",
            },
            (response) => {
              const encryptedEmail = response.ciphertext; // Uint8Array
              console.log(
                "Encrypted email (as received from the service worker): ",
                encryptedEmail
              );

              let byteDataToSend = objectToUInt8array(encryptedEmail);
              console.log("Byte data that will be sent: ", byteDataToSend);

              //Replace subject and body of the email with text explaining this is an IRMA encrypted email
              const body =
                "You received a PostGuard encrypted email from " +
                userEmail +
                "\n" +
                "There are four ways to read this protected email:\n" +
                '1) If you use Outlook and have already installed PostGuard, click on the "Decrypt Email"-button. \n' +
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
                'The "Encryption for all"-team of the Radboud University has developed PostGuard.\n' +
                "PostGuard uses the IRMA app for authentication. \n" +
                "More information via: https://www.postguard.eu\n" +
                "\n" +
                "What is the IRMA app?\n" +
                "\n" +
                "When you receive a PostGuarded email, you need to use the IRMA app to prove that you\n" +
                "really are the intended recipient of the email.\n" +
                "IRMA is a separate privacy-friendly authentication app\n" +
                "(which is used also for other authentication purposes).\n" +
                "The free IRMA app can be downloaded via the App Store and Play Store.\n" +
                "More information via: https://irma.app";

              compose_ref.subject(subject);
              compose_ref.body(body);

              //And finally the fun part: try to add this as an attachment. For this, I use the hack suggested here: https://github.com/KartikTalwar/gmail.js/issues/635#issuecomment-808770417

              const fileInput = compose.$el.find("[type=file]")[0];
              const file = new File([byteDataToSend], "postguard.encrypted", {
                type: "application/postguard",
              });
              const dt = new DataTransfer();
              dt.items.add(file);
              fileInput.files = dt.files;
              const evt = document.createEvent("HTMLEvents");
              evt.initEvent("change", false, true);
              fileInput.dispatchEvent(evt);

              // Last thing: automatically send the email once everything is done
              compose_ref.send();
            }
          );
        },
        "Custom Style Classes"
      );
    });
  });
}
